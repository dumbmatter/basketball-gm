const fs = require("fs");
const CleanCSS = require('clean-css');
const replace = require("replace");
const fse = require('fs-extra');
const sass = require('node-sass');

const reset = () => {
    console.log('Resetting "build" directory...');

    fse.removeSync('build');
    fs.mkdirSync('build');
    fs.mkdirSync('build/gen');
};

const copyFiles = () => {
    console.log('Copying files from "src" directory to "build" directory...');
    const foldersToIgnore = ['css', 'js', 'templates'];

    fse.copySync('src', 'build', {
        filter: filename => {
            // Loop through folders to ignore.
            for (const folder of foldersToIgnore) {
                if (filename.indexOf(`src/${folder}`) === 0) {
                    return false;
                }
            }

            return true;
        },
    });

    // Remove the empty folders created by the "filter" function.
    for (const folder of foldersToIgnore) {
        fse.removeSync(`build/${folder}`);
    }
};

const minifyCss = () => {
    console.log("Minifying CSS...");
    let source = '';

    /*
     * CSS files
     */

    const cssFilenames = [];

    // Read each CSS file into a string.
    for (const filename of cssFilenames) {
        source += fs.readFileSync(`src/css/${filename}`);
    }

    /*
     * Sass files
     */

    // If more Sass files are needed, then create them and @import them into
    // this main Sass file.
    const sassFilePath = 'src/css/bbgm.scss';
    const sassResult = sass.renderSync({
        file: sassFilePath,
    });
    source += sassResult.css.toString();

    /*
     * Use CleanCSS to minify CSS and Sass sources.
     */
    const result = (new CleanCSS()).minify(source);
    if (result.errors.length > 0) {
        console.log('clean-css errors', result.errors);
    }
    if (result.warnings.length > 0) {
        console.log('clean-css warnings', result.warnings);
    }
    fs.writeFileSync("build/gen/bbgm.css", result.styles);
};

const setTimestamps = () => {
    console.log("Setting timestamps...");

    const d = new Date();
    const date = d.toISOString().split('T')[0].replace(/-/g, '.');
    const rev = `${date}.${d.getMinutes() + 60 * d.getHours()}`;
    console.log(`rev ${rev}`);

    replace({
        regex: "TIMESTAMP_GOES_HERE",
        replacement: d.toString(),
        paths: ["build/bbgm.appcache"],
        silent: true,
    });
    replace({
        regex: "REV_GOES_HERE",
        replacement: rev,
        paths: ["build/index.html"],
        silent: true,
    });
};

module.exports = {
    reset,
    copyFiles,
    minifyCss,
    setTimestamps,
};

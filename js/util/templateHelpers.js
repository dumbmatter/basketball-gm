/**
 * @name util.templateHelpers
 * @namespace Knockout helper functions.
 */
define(["globals", "lib/faces", "lib/knockout", "util/helpers"], function (g, faces, ko, helpers) {
    "use strict";

    ko.bindingHandlers.round = {
        update: function (element, valueAccessor) {
            var args = valueAccessor();
            return ko.bindingHandlers.text.update(element, function () {
                return helpers.round(ko.unwrap(args[0]), args[1]);
            });
        }
    };

    ko.bindingHandlers.roundWinp = {
        update: function (element, valueAccessor) {
            var arg, output;

            arg = ko.unwrap(valueAccessor());

            output = parseFloat(arg).toFixed(3);

            if (output[0] === "0") {
                // Delete leading 0
                output = output.slice(1, output.length);
            } else {
                // Delete trailing digit if no leading 0
                output = output.slice(0, output.length - 1);
            }

            return ko.bindingHandlers.text.update(element, function () {
                return output;
            });
        }
    };

    ko.bindingHandlers.letterGrade = {
      update: function(element, valueAccessor) {
        var arg, output;
        arg = ko.unwrap(valueAccessor());

        if (arg < 0.20) {
          output = 'F';
        } else if (arg < 0.25) {
          output = 'D-';
        } else if (arg < 0.35) {
          output = 'D';
        } else if (arg < 0.40) {
          output = 'D+';
        } else if (arg < 0.45) {
          output = 'C-';
        } else if (arg < 0.55) {
          output = 'C';
        } else if (arg < 0.60) {
          output = 'C+';
        } else if (arg < 0.65) {
          output = 'B-';
        } else if (arg < 0.75) {
          output = 'B';
        } else if (arg < 0.80) {
          output = 'B+';
        } else if (arg < 0.85) {
          output = 'A-';
        } else if (arg < 0.95) {
          output = 'A';
        } else {
          output = 'A+';
        }

        return ko.bindingHandlers.text.update(element, function() {
          return output;
        });
      }
    };

    // It would be better if this took the series object directly
    ko.bindingHandlers.matchup = {
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var args, season, series, source;

            args = valueAccessor();

            season = viewModel.season();
            series = viewModel.series()[args[0]][args[1]];

            source = '';
            if (series && series.home.tid) {
                if (series.home.tid() === g.userTid) { source += '<span class="bg-info">'; }
                if (series.home.hasOwnProperty("won") && series.home.won() === 4) { source += '<strong>'; }
                source += series.home.seed() + '. <a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[series.home.tid()], season]) + '">' + g.teamRegionsCache[series.home.tid()] + '</a>';
                if (series.home.hasOwnProperty("won")) { source += ' ' + series.home.won(); }
                if (series.home.hasOwnProperty("won") && series.home.won() === 4) { source += '</strong>'; }
                if (series.home.tid() === g.userTid) { source += '</span>'; }
                source += '<br>';

                if (series.away.tid() === g.userTid) { source += '<span class="bg-info">'; }
                if (series.home.hasOwnProperty("won") && series.away.won() === 4) { source += '<strong>'; }
                source += series.away.seed() + '. <a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[series.away.tid()], season]) + '">' + g.teamRegionsCache[series.away.tid()] + '</a>';
                if (series.away.hasOwnProperty("won")) { source += ' ' + series.away.won(); }
                if (series.home.hasOwnProperty("won") && series.away.won() === 4) { source += '</strong>'; }
                if (series.away.tid() === g.userTid) { source += '</span>'; }
            }

            return ko.bindingHandlers.html.update(element, function () {
                return source;
            });
        }
    };

    ko.bindingHandlers.newWindow = {
        update: function (element, valueAccessor) {
            var args, url;

            args = valueAccessor();

            if (args.length === 0) {
                url = document.URL;
            } else {
                url = helpers.leagueUrl(args);
            }

            return ko.bindingHandlers.html.update(element, function () {
                // Window name is set to the current time, so each window has a unique name and thus a new window is always opened
                return '<a href="javascript:(function () { window.open(\'' + url + '?w=popup\', Date.now(), \'height=600,width=800,scrollbars=yes\'); }())" class="new_window" title="Move To New Window" data-no-davis="true"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA0AAAANABeWPPlAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFOSURBVDiNlZS9isJAFIU/F6s0m0VYYiOrhVukWQsbK4t9CDtbexGs8xY+ghY+QRBsbKcTAjZaqKyGXX2Bs00S1AwBD1yYOXPvmXvv/CAJSQAuoGetzAPCMKRSqTzSOURRRK/Xo1wqldyEewXwfR/P8zLHIAhYr9fZ3BjDeDym1WoBUAZ+i3ZaLBYsl8s7zhiTCbwk3DfwaROYz+fsdjs6nU7GOY6TjVOBGPixCbiuy2g0YrVa0Ww2c+svlpg7DAYDptMp3W6XyWRi9RHwRXKMh8NBKYbDoQC1221dr1dtNhv1+33NZjMZY9KjtAsEQSBAvu/rfD7rEYUC2+1WjuOo0Whov9/ngm8FchcJoFarEYYhnudRrVYLe5QTOJ1OANTrdQCOx6M1MI5jexOftdsMLsBbYb7wDkTAR+KflWC9hRakr+wi6e+2hGfNTb+Bf9965Lxmndc1AAAAAElFTkSuQmCC" height="16" width="16"></a>';
            });
        }
    };

    ko.bindingHandlers.skillsBlock = {
        update: function (element, valueAccessor) {
            var arg = valueAccessor();
            return ko.bindingHandlers.html.update(element, function () {
                return helpers.skillsBlock(ko.unwrap(arg));
            });
        }
    };

    ko.bindingHandlers.watchBlock = {
        update: function (element, valueAccessor) {
            var args = valueAccessor();
            return ko.bindingHandlers.html.update(element, function () {
                return helpers.watchBlock(ko.unwrap(args[0]), ko.unwrap(args[1]));
            });
        }
    };

    ko.bindingHandlers.currency = {
        update: function (element, valueAccessor) {
            var args = valueAccessor();
            return ko.bindingHandlers.text.update(element, function () {
                return helpers.formatCurrency(ko.unwrap(args[0]), args[1]);
            });
        }
    };

    ko.bindingHandlers.numberWithCommas = {
        update: function (element, valueAccessor) {
            var args = valueAccessor();
            return ko.bindingHandlers.text.update(element, function () {
                return helpers.numberWithCommas(ko.unwrap(args));
            });
        }
    };

    ko.bindingHandlers.playerNameLabels = {
        update: function (element, valueAccessor) {
            var args, injury;

            args = valueAccessor();
            injury = ko.unwrap(args[2]);
            injury.type = ko.unwrap(injury.type);
            injury.gamesRemaining = ko.unwrap(injury.gamesRemaining);

            return ko.bindingHandlers.html.update(element, function () {
                return helpers.playerNameLabels(ko.unwrap(args[0]), ko.unwrap(args[1]), injury, ko.unwrap(args[3]), ko.unwrap(args[4]));
            });
        }
    };

    ko.bindingHandlers.attrLeagueUrl = {
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var args, attr, options, toAttr;

            args = valueAccessor();
            toAttr = {};

            for (attr in args) {
                if (args.hasOwnProperty(attr)) {
                    // No query string for forms because https://github.com/olivernn/davis.js/issues/75
                    if (attr === "action") {
                        options = {noQueryString: true};
                    } else {
                        options = {};
                    }

                    toAttr[attr] = helpers.leagueUrl(args[attr], options, viewModel.lid);
                }
            }

            return ko.bindingHandlers.attr.update(element, function () {
                return toAttr;
            });
        }
    };

    ko.bindingHandlers.dropdown = {
        init: function () {
            // http://www.knockmeout.net/2012/05/quick-tip-skip-binding.html
            return {
                controlsDescendantBindings: true
            };
        },
        update: function (element, valueAccessor) {
            var arg = valueAccessor();
            return ko.bindingHandlers.html.update(element, function () {
                return '<form id="' + arg + '-dropdown" class="form-inline pull-right bbgm-dropdown" role="form">' +
                       '<!-- ko foreach: fields -->' +
                         '<div class="form-group" style="margin-left: 4px; margin-bottom: 4px;">' +
                         '<select data-bind="attr: {id: id, class: \'form-control \' + name}, options: options, optionsText: \'val\', optionsValue: \'key\', value: selected">' +
                         '</select>' +
                         '</div>' +
                       '<!-- /ko -->' +
                       '</form>';
            });
        }
    };

    ko.bindingHandlers.recordAndPlayoffs = {
        update: function (element, valueAccessor) {
            var abbrev, args, extraText, lost, option, output, playoffRoundsWon, season, won;

            args = valueAccessor();
            abbrev = ko.unwrap(args[0]);
            season = ko.unwrap(args[1]);
            won = ko.unwrap(args[2]);
            lost = ko.unwrap(args[3]);
            playoffRoundsWon = ko.unwrap(args[4]);
            option = args.length > 5 ? ko.unwrap(args[5]) : null;

            extraText = "";
            if (playoffRoundsWon === 4) {
                extraText = "league champs";
            } else if (playoffRoundsWon === 3) {
                extraText = "conference champs";
            } else if (playoffRoundsWon === 2) {
                extraText = "made conference finals";
            } else if (playoffRoundsWon === 1) {
                extraText = "made second round";
            } else if (playoffRoundsWon === 0) {
                extraText = "made playoffs";
            }

            output = '';
            if (option !== "noSeason") {
                output += '<a href="' + helpers.leagueUrl(["roster", abbrev, season]) + '">' + season + '</a>: ';
            }
            output += '<a href="' + helpers.leagueUrl(["standings", season]) + '">' + won + '-' + lost + '</a>';
            if (extraText) {
                output += ', <a href="' + helpers.leagueUrl(["playoffs", season]) + '">' + extraText + '</a>';
            }

            return ko.bindingHandlers.html.update(element, function () {
                return output;
            });
        }
    };

    ko.bindingHandlers.draftAbbrev = {
        update: function (element, valueAccessor) {
            var args = valueAccessor();
            return ko.bindingHandlers.html.update(element, function () {
                return helpers.draftAbbrev(ko.unwrap(args[0]), ko.unwrap(args[1]));
            });
        }
    };

    ko.bindingHandlers.ordinal = {
        update: function (element, valueAccessor) {
            var arg = valueAccessor();
            return ko.bindingHandlers.html.update(element, function () {
                return helpers.ordinal(parseInt(ko.unwrap(arg), 10));
            });
        }
    };

    ko.bindingHandlers.gameScore = {
        update: function(element, valueAccessor) {
            var arg = valueAccessor();
            return ko.bindingHandlers.html.update(element, function () {
                return helpers.round(arg.pts() + 0.4 * arg.fg() - 0.7 * arg.fga() - 0.4 * (arg.fta() - arg.ft()) + 0.7 * arg.orb() + 0.3 * (arg.trb() - arg.orb()) + arg.stl() + 0.7 * arg.ast() + 0.7 * arg.blk() - 0.4 * arg.pf() - arg.tov(), 1);
            });
        }
    };
});
/**
 * @name views.newLeague
 * @namespace Create new league form.
 */
define(["globals", "ui", "core/league", "lib/jquery", "util/bbgmView", "util/helpers", "util/viewHelpers"], function (g, ui, league, $, bbgmView, helpers, viewHelpers) {
    "use strict";

    function post(req) {
        var file, reader, startingSeason, tid;

        $("#create-new-league").attr("disabled", "disabled");

        startingSeason = 2013;

        tid = Math.floor(req.params.tid);
        if (tid >= 0 && tid <= 29) {
            // Davis.js can't handle file uploads, so do this manually first
            if (req.params.rosters === "custom-rosters") {
                file = $("input[name='custom-rosters']").get(0).files[0];
                if (file !== undefined) {
                    reader = new window.FileReader();
                    reader.readAsText(file);
                    reader.onload = function (event) {
                        var roster;

                        roster = JSON.parse(event.target.result);

                        startingSeason = roster.startingSeason !== undefined ? roster.startingSeason : startingSeason;

                        league.create(req.params.name, tid, roster.players, roster.teams, startingSeason, function (lid) {
                            ui.realtimeUpdate([], "/l/" + lid);
                        });
                    };
                } else {
                    league.create(req.params.name, tid, undefined, undefined, startingSeason, function (lid) {
                        ui.realtimeUpdate([], "/l/" + lid);
                    });
                }
            } else {
                league.create(req.params.name, tid, undefined, undefined, startingSeason, function (lid) {
                    ui.realtimeUpdate([], "/l/" + lid);
                });
            }
        }
    }

    function updateNewLeague(inputs, updateEvents) {
        var deferred;

        deferred = $.Deferred();

        g.dbm.transaction("leagues").objectStore("leagues").openCursor(null, "prev").onsuccess = function (event) {
            var cursor, data, l, newLid, teams;

            cursor = event.target.result;
            if (cursor) {
                newLid = cursor.value.lid + 1;
            } else {
                newLid = 1;
            }
            
            var tx = g.dbl.transaction("teams")
            var teamStore = tx.objectStore("teams");
            var teamNameArray=[];
            for(var a=0;a<30;a++){
            	var object=teamStore.getAll(a);
            	object.onsuccess=function(event){
            		var currTeam=event.target.result;
            		var newObjTeam={name: currTeam[0].name};
            		teamNameArray.push(newObjTeam);
            		//console.log(currTeam[0].name)
            	}
            }
            teams = helpers.getTeams(undefined,teamNameArray);

            deferred.resolve({
                name: "League " + newLid,
                teams: teams
            });
        };

        return deferred.promise();
    }

    function uiFirst(vm) {
        var selectRosters, selectTeam, teams, updatePopText, updateShowUploadForm;

        ui.title("Create New League");

        var tx = g.dbl.transaction("teams")
        var teamStore = tx.objectStore("teams");
        var teamNameArray=[];
        for(var a=0;a<30;a++){
        	var object=teamStore.getAll(a);
        	object.onsuccess=function(event){
        		var currTeam=event.target.result;
        		var newObjTeam={name: currTeam[0].name};
        		teamNameArray.push(newObjTeam);
        		//console.log(currTeam[0].name)
        	}
        }
        teams = helpers.getTeams(undefined,teamNameArray);

        updatePopText = function () {
            var difficulty, team;

            team = teams[selectTeam.val()];

            if (team.popRank <= 5) {
                difficulty = "very easy";
            } else if (team.popRank <= 13) {
                difficulty = "easy";
            } else if (team.popRank <= 16) {
                difficulty = "normal";
            } else if (team.popRank <= 23) {
                difficulty = "hard";
            } else {
                difficulty = "very hard";
            }

            $("#pop-text").html("Region population: " + team.pop + " million, #" + team.popRank + " leaguewide<br>Difficulty: " + difficulty);
        };

        selectTeam = $("select[name='tid']");
        selectTeam.change(updatePopText);
        selectTeam.keyup(updatePopText);

        updateShowUploadForm = function () {
            if (selectRosters.val() === "custom-rosters") {
                $("#custom-rosters").show();
            } else {
                $("#custom-rosters").hide();
            }
        };

        selectRosters = $("select[name='rosters']");
        selectRosters.change(updateShowUploadForm);
        selectRosters.keyup(updateShowUploadForm);

        updatePopText();
        updateShowUploadForm();

        $("#help-rosters").clickover({
            title: "Rosters",
            html: true,
            content: 'Rosters of the teams in your new league can either be filled by randomly-generated players or by players from a <a href="/manual/custom_rosters">custom roster file</a> you upload.'
        });
    }

    return bbgmView.init({
        id: "newLeague",
        beforeReq: viewHelpers.beforeNonLeague,
        post: post,
        runBefore: [updateNewLeague],
        uiFirst: uiFirst
    });
});
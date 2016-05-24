/**
 * App
 **/
var App = function(){};
App.prototype.constructor = App;
App.prototype = {
    stage: null,
    brainteaserApi: null,
    l10n: {
        loading: {
            start_training: "Starte Training-Session",
            start_exercise: "Starte Übung",
            solve_exercise: "Überprüfe Lösung",
            load_highscores: "Lade Highscores"
        }
    }
};
App.prototype.init = function(stageWrapper){
    this.brainteaserApi = new BrainteaserApi;
    this.stage = new Stage(stageWrapper);

    var api = this.brainteaserApi,
        stage = this.stage,
        l10n = this.l10n;

    stage.createGrid(4,4);

    // start training
    stage.startLoadingAnimation(l10n.loading.start_training);
    $.when(
      api.createTraining()
    ).done(function(data, textStatus, jqXHR) {
        api.rememberTrainingUri(
            api.extractCreatedResourceLocation(jqXHR)
        );
        $.when(
            api.getTraining()
        ).done(function(data, textStatus, jqXHR) {
            stage.stopLoadingAnimation();
            stage.updateTrainingData(
                api.extractData(jqXHR)
            );
            $("#start-exercise").show();
        });
    });

    // start exercise
    $("#start-exercise").click(function(){
        $(this).hide();
        stage.startLoadingAnimation(l10n.loading.start_exercise);
        $.when(
          api.createExercise()
        ).done(function(data, textStatus, jqXHR) {
            api.rememberExerciseUri(
                api.extractCreatedResourceLocation(jqXHR)
            );
            $.when(
                api.getExercise()
            ).done(function(data, textStatus, jqXHR) {
                stage.stopLoadingAnimation();
                stage.startExercise(
                    api.extractData(jqXHR)
                );
            });
        });
    });

    // solve exercise
    stageWrapper.on("stage:selectingTilesDone", function(event, selectedTiles){
        stage.startLoadingAnimation(l10n.loading.solve_exercise);
        $.when(
            api.solveExercise(
                JSON.stringify({
                    "tiles": selectedTiles
                })
            )
        ).done(function(data, textStatus, jqXHR){
            var solutionResultData = api.extractData(jqXHR);
            $.when(
                api.getTraining()
            ).done(function(data, textStatus, jqXHR) {
                stage.stopLoadingAnimation();
                var trainingData = api.extractData(jqXHR);
                stage.showResults(
                    solutionResultData,
                    trainingData
                )
            });
        });
    });

    // finish training
    $("#finish-training").click(function(){
        $(this).hide();

        $(".row-container").hide();
        $("#tutorial").hide();
        $("#start-exercise").hide();
        $("#training-finished-wrapper").css('display', 'inline-block');
    });

    // load highscores
    var that = this;
    $(".show-highscores").click(function() {
        that.showHighscores();
    });
};
App.prototype.showHighscores = function() {
    var api = this.brainteaserApi,
        stage = this.stage;

    stage.startLoadingAnimation(this.l10n.loading.load_highscores);
    $.when(
        api.getHighscores()
    ).done(function(data, textStatus, jqXHR){
        stage.stopLoadingAnimation();
        stage.showHighscores(
            api.extractData(jqXHR)
        )
    });
};

/**
 * BrainteaserApi
 **/
var BrainteaserApi = function(){
    if (window.location.host.match(/192\.168\.50\.5/)) {
        this.baseUri = "http://192.168.50.7";
    } else {
        this.baseUri = "http://brainteaser-api.jan-floegel.de";
    }
};
BrainteaserApi.prototype.constructor = BrainteaserApi;
BrainteaserApi.prototype = {
    baseUri: "",
    trainingUri: null,
    currentExerciseUri: null
};
BrainteaserApi.prototype.get = function(options) {
    return $.ajax($.extend(options, {type: "GET"}));
};
BrainteaserApi.prototype.post = function(options) {
    return $.ajax($.extend(options, {type: "POST"}));
};
BrainteaserApi.prototype.rememberTrainingUri = function(trainingUri) {
    this.trainingUri = this.baseUri + trainingUri;
};
BrainteaserApi.prototype.rememberExerciseUri = function(exerciseUri) {
    this.currentExerciseUri = this.baseUri + exerciseUri;
};
BrainteaserApi.prototype.createTraining = function() {
    return this.post({
        url: this.baseUri + "/trainings"
    });
};
BrainteaserApi.prototype.getTraining = function() {
    return this.get({
        url: this.trainingUri
    });
};
BrainteaserApi.prototype.extractCreatedResourceLocation = function(jqXHR) {
    return jqXHR.getResponseHeader('Location');
};
BrainteaserApi.prototype.extractData = function(jqXHR) {
    return jqXHR.responseJSON.data;
};
BrainteaserApi.prototype.createExercise = function() {
    return this.post({
        url: this.trainingUri + "/exercises"
    });
};
BrainteaserApi.prototype.getExercise = function() {
    return this.get({
        url: this.currentExerciseUri
    });
};
BrainteaserApi.prototype.solveExercise = function(postData) {
    return this.post({
        url: this.currentExerciseUri + "/solve",
        data: postData
    });
};
BrainteaserApi.prototype.getHighscores = function() {
    return this.get({
        url: this.baseUri + "/trainings/highscores"
    });
};
 
/**
 * Stage
 **/
var Stage = function(wrapper){
    this.wrapper = wrapper;
};
Stage.prototype.constructor = Stage;
Stage.prototype = {
    selectedTilesCount: 0,
    uiBlocked: false,
    tileAnimationQueue: [],
    maxSelectedTilesCount: 0
};
Stage.prototype.startLoadingAnimation = function(message) {
    $("#loading-animation").find(".message").html(message);
    $("body").addClass("loading");
};
Stage.prototype.stopLoadingAnimation = function() {
    $("body").removeClass("loading");
};
Stage.prototype.startExercise = function(data) {
    var numColumns = data.grid_size.cols,
        numRows = data.grid_size.rows,
        tiles = data.colored_tiles,
        num = data.num;
        
    $("#max-selected-tiles-count").html(tiles.length.toString());
    this.maxSelectedTilesCount = tiles.length;

    $("#exercise-num").html(num.toString());

    this.createGrid(numRows, numColumns);
    var that = this;
    setTimeout(function() {
        that.playAnimation(tiles);
    }, 1000);
};
Stage.prototype.createGrid = function(numColumns, numRows) {
    var rowWrapper = $(".row-wrapper", this.wrapper);
    rowWrapper.html("");
    this.uiBlocked = true;
    for (var i=0; i < numRows; i++) {
        var row = $("<div class='row'></div>");
        for (var j=0; j < numColumns; j++) {
            var tile = $("<div class='tile' id='tile" + i + "-" + j + "'></div>");
            this.prepareTileForUi(tile);
            tile.appendTo(row);
        }
        row.appendTo(rowWrapper);
    }
};
Stage.prototype.updateTrainingData = function(data) {
    $("#score").html(data.score);
    $("#max-exercise-num").html(data.num_exercises);
    $("#training-id").html(data.id);
};
Stage.prototype.showResults = function(data, trainingData) {
    var that = this;
    data.correct.forEach(function(coord) {
        that.getTile(coord.x, coord.y).addClass("correct");
    });
    data.wrong.forEach(function(coord) {
        that.getTile(coord.x, coord.y).addClass("wrong");
    });
    data.missing.forEach(function(coord) {
        that.getTile(coord.x, coord.y).addClass("missing");
    });
    
    $("#last-exercise-score").html("+" + data.score);

    this.updateTrainingData(trainingData);

    // final exercise done
    if( parseInt($("#exercise-num").html()) == parseInt($("#max-exercise-num").html()) ) {
        $("#finish-training").show();
    } else {
        $("#start-exercise").show();
    }
};
Stage.prototype.showHighscores = function(highscoreData) {
    var highscoresWrapper = $("#highscores-wrapper");
    highscoresWrapper.html("");
    var rank = 1;
    highscoreData.forEach(function(value){
        var highscoreRow = $("<div><span class='rank'>" + rank + "</span><span class='username'>" + value.id + "</span><span class='score'>" + value.score + "</span></div>");
        highscoreRow.appendTo(highscoresWrapper);
        rank++;
    });
    $("#training-view").hide();
    $("#highscores-view").show();
};
Stage.prototype.selectTile = function(tile){
    if (tile.hasClass("active") || this.uiBlocked || this.selectedTilesCount >= this.maxSelectedTilesCount) {
        return;
    }
    tile.addClass("active"); 
    this.selectedTilesCount++;
    if (this.selectedTilesCount == this.maxSelectedTilesCount) {
        var that = this;
        setTimeout(function(){
            var tiles = [];
            $(".tile.active").each(function(key, domString) {
                var coords = $(domString).attr('id').replace('tile', '').split('-');
                tiles.push({x: coords[0], y: coords[1]});
            });
            that.wrapper.trigger("stage:selectingTilesDone", [ tiles ]);
        }, 700);
    }
};
Stage.prototype.prepareTileForUi = function(tile){
    var that = this;
    tile.click(function(){
        that.selectTile($(this));
    });    
};
Stage.prototype.doReset = function() {
    $(".tile", this.wrapper).removeClass("active");
    this.selectedTilesCount = 0;
};
Stage.prototype.getTile = function(x,y) {
    return $("#tile" + x + "-" + y, this.wrapper);
};
Stage.prototype.playAnimation = function(markedTiles) {
    this.doReset();
    this.uiBlocked = true;

    this.tileAnimationQueue = markedTiles;
    this.playAnimationStep();
};
Stage.prototype.playAnimationStep = function() {
    var that = this;
    if (this.tileAnimationQueue.length > 0) {
        var tileCoord = that.tileAnimationQueue.shift();
        setTimeout(function(){
            that.getTile(tileCoord.x, tileCoord.y).addClass("active");
            that.playAnimationStep();
        }, 400);            
    } else {
        setTimeout(function(){
            that.doReset();
            setTimeout(function(){
                that.uiBlocked = false;
            }, 1000);
        }, 1000);
    }
};

$(document).ready(function(){
    var app = new App();
    app.init(
        $("#stage")
    );
});
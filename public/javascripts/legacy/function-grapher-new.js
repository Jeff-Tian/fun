;(function ($, console, lex, parser, IntervalArithmetic) {
    $(document).ready(function () {
        var FunGrapher = function () {
        };
        FunGrapher.UI = function () {
            function addExpressionLine($target, expression) {
                if (arguments.length <= 0) {
                    $target = null
                } else {
                    if (!(arguments[0] instanceof jQuery)) {
                        expression = arguments[0];
                        $target = null
                    }
                }
                if (!$target) {
                    $target = $("#leftPanel div.expressionLine:last");
                    if ($target.length <= 0) {
                        $target = $("#leftPanel div.placeHolder:first")
                    }
                } else {
                    $target = $target.parent()
                }
                var html = "<div class='expressionLine'><div id='taExp-" + guid() + "' class='expressionBox'><span class='mathquill-editable'></span><span class='icon clear'>×</span></div></div>";
                var $expressionLine = $(html).insertAfter($target);
                $expressionLine.find("span.mathquill-editable").mathquill("editable").mathquill("latex", !!expression ? expression : "").focus();
                setTimeout(function () {
                    $expressionLine.find("span.mathquill-editable").find("textarea").focus()
                }, 100);
                $expressionLine.find("span.mathquill-editable textarea, span.mathquill-editable input").bind("keydown", myKeyDown).bind("keyup", myKeyUp).bind("blur", myBlur).keyup();
                var ua = navigator.userAgent.toLowerCase();
                var isAndroid = ua.indexOf("android") >= 0;
                if (isAndroid) {
                    $expressionLine.find("span.mathquill-editable textarea, span.mathquill-editable input").bind("keypress", myKeyPress).keypress()
                }
            }

            function addExpression(expression) {
                var availableLines = $("div.expressionLine").filter(function (index) {
                    var content = $(this).find("span.mathquill-editable").mathquill("latex");
                    return !content
                });
                if (availableLines.length > 0) {
                    $(availableLines[0]).find("span.mathquill-editable").mathquill("latex", expression).find("textarea, input").keyup().blur()
                } else {
                    addExpressionLine(expression)
                }
            }

            function getAllExpressions() {
                var expressions = [];
                $.each($("div.expressionLine"), function (index, value) {
                    var content = $(value).find("span.mathquill-editable").mathquill("latex");
                    if (!!content) {
                        expressions.push(content)
                    }
                });
                return expressions
            }

            function addExpressions(expressionList) {
                if (expressionList != null && $.isArray(expressionList)) {
                    var availableLines = $("div.expressionLine").filter(function (index) {
                        var content = $(this).find("span.mathquill-editable").mathquill("latex");
                        return !content
                    });
                    var i = 0;
                    for (i = 0; i < availableLines.length; i++) {
                        $(availableLines[i]).find("span.mathquill-editable").mathquill("latex", !expressionList[i] ? "" : expressionList[i]).find("textarea, input").keyup().blur()
                    }
                    for (; i < expressionList.length; i++) {
                        addExpressionLine(expressionList[i])
                    }
                }
            }

            function deleteExpressionLine($mathquill) {
                var $expressionLine = $mathquill.closest("div.expressionLine").removeAttr("data");
                plotExpressionLine($expressionLine);
                removeErrorStyle($expressionLine);
                $expressionLine.remove();
                autoPositionErrorMessageBox()
            }

            function deleteAllExpressionLines() {
                var $expressionLines = $("#leftPanel div.expressionLine").not(":first").each(function (index, expressionLine) {
                    $(expressionLine).removeAttr("data");
                    plotExpressionLine($(expressionLine));
                    removeErrorStyle($(expressionLine))
                }).remove();
                $("#leftPanel div.expressionLine:first .clear").click();
                plotAllExpressionBoxes()
            }

            function clearExpression($clearButton) {
                var $mathquill = $clearButton.closest("div.expressionBox").find("span.mathquill-editable");
                $mathquill.mathquill("latex", "");
                removeErrorStyle($mathquill.closest("div.expressionLine"));
                var $expressionLine = $clearButton.closest("div.expressionLine").removeAttr("data").removeAttr("expression").removeAttr("inputtype");
                plotExpressionLine($expressionLine)
            }

            function plotExpressionLine($expressionLine) {
                var data = [];
                var series = $.parseJSON($expressionLine.attr("data"));
                var oldSeriesId = $expressionLine.find("div.expressionBox").attr("id");
                if (!!series && series.length > 0)series.id = oldSeriesId;
                var type = $expressionLine.attr("inputType");
                var showLine = true;
                var radius = 3;
                var symbol = "circle";
                var shadow = 3;
                if (type == "implicit function") {
                    showLine = false;
                    radius = 0.1;
                    symbol = "circle";
                    shadow = 0
                }
                if (!!series && series.length > 0) {
                    data.push({
                        label: $expressionLine.find("span.mathquill-editable").mathquill("latex"),
                        data: series,
                        input: $expressionLine.find("span.mathquill-editable").mathquill("latex"),
                        lines: {show: showLine},
                        points: {show: !showLine, radius: radius, symbol: symbol},
                        viewPortWidth: plot.width(),
                        type: type,
                        shadowSize: shadow
                    })
                }
                if (plot == null) {
                    plot = $.plot("#canvas", data, options)
                } else {
                    var oldData = plot.getData();
                    if (!!oldData && oldData instanceof Array) {
                        oldData = oldData.filter(function (s) {
                            if (!!s && !!s.color)delete s.color;
                            return !!s && !!s.data && (typeof s.data.id != "undefined") && s.data.id != oldSeriesId
                        })
                    }
                    var newData = oldData;
                    if (!!data && data.length > 0) {
                        newData = oldData.concat(data)
                    }
                    plot.setData(newData);
                    plot.draw()
                }
                validViewPort = {
                    left: plot.getOptions().xaxis.min,
                    right: plot.getOptions().xaxis.max,
                    bottom: plot.getOptions().yaxis.min,
                    top: plot.getOptions().yaxis.max
                };
                isDrawing = false;
                coor = new zizhujy.com.GeneralRectangularCoordinate(plot.getOptions().xaxis.min, plot.getOptions().xaxis.max, plot.getOptions().yaxis.min, plot.getOptions().yaxis.max, plot.width(), plot.height());
                pixelWidth = coor.pixelWidth;
                pixelHeight = coor.pixelHeight
            }

            function plotAllExpressionBoxes() {
                var data = [];
                $("div.expressionLine").each(function (index, value) {
                    var series = $.parseJSON($(this).attr("data"));
                    if (!!series)series.id = $(this).find("div.expressionBox").attr("id");
                    var type = ($(this).attr("inputType"));
                    var showLine = true;
                    var radius = 3;
                    var symbol = "circle";
                    var shadow = 3;
                    if (type == "implicit function") {
                        showLine = false;
                        radius = 0.1;
                        symbol = "circle";
                        shadow = 0
                    }
                    if (!!series && series.length > 0) {
                        data.push({
                            label: $(this).find("span.mathquill-editable").mathquill("latex"),
                            data: series,
                            input: $(this).find("span.mathquill-editable").mathquill("latex"),
                            inputType: type,
                            lines: {show: showLine},
                            points: {show: !showLine, radius: radius, symbol: symbol},
                            viewPortWidth: plot.width(),
                            type: type,
                            shadowSize: shadow,
                            color: index
                        })
                    }
                });
                if (plot == null) {
                    plot = $.plot("#canvas", data, options)
                } else {
                    plot = $.plot("#canvas", data, $.extend(true, plot.getOptions(), options))
                }
                validViewPort = {
                    left: plot.getOptions().xaxis.min,
                    right: plot.getOptions().xaxis.max,
                    bottom: plot.getOptions().yaxis.min,
                    top: plot.getOptions().yaxis.max
                };
                isDrawing = false;
                coor = new zizhujy.com.GeneralRectangularCoordinate(plot.getOptions().xaxis.min, plot.getOptions().xaxis.max, plot.getOptions().yaxis.min, plot.getOptions().yaxis.max, plot.width(), plot.height());
                pixelWidth = coor.pixelWidth;
                pixelHeight = coor.pixelHeight
            }

            function deleteErrorMessageBox(associatedId) {
                $("div.error-message-box[associatedExpressionId='" + associatedId + "']").remove();
                autoWidthCanvasWrapper()
            }

            function autoPositionErrorMessageBox() {
                $("div.error-message-box").each(function (i) {
                    var $expressionLine = $("#" + $(this).attr("associatedExpressionId")).closest("div.expressionLine");
                    var right = $("#canvas").parent().parent().innerWidth() - $expressionLine.offset().left + 5;
                    if ($("#main > #app").length > 0) {
                        var $page = $("body");
                        var $app = $("#app");
                        right = $page.innerWidth() - $expressionLine.offset().left + 5
                    }
                    $(this).css({right: right, top: $expressionLine.offset().top})
                });
                autoWidthCanvasWrapper()
            }

            function removeErrorStyle($expressionLine) {
                $expressionLine.removeClass("error");
                $expressionLine.find("div.error-icon-box").remove();
                var expressionId = $expressionLine.find("div.expressionBox").attr("id");
                deleteErrorMessageBox(expressionId);
                autoWidthCanvasWrapper()
            }

            function showErrorStyle($expressionLine, ar) {
                $expressionLine.addClass("error");
                $expressionLine.find("div.error-icon-box").remove();
                $expressionLine.append("<div class='error-icon-box'><span class='icon'>&#x26a0;</span></div>");
                var expressionId = $expressionLine.find("div.expressionBox").attr("id");
                var $oldErrMsg = $(String.format("div.error-message-box[associatedExpressionId='{0}']", expressionId));
                var isActive = $oldErrMsg.hasClass("active");
                $oldErrMsg.remove();
                var right = $("#canvas").parent().parent().innerWidth() - $expressionLine.offset().left + 5;
                if ($("#main > #app").length > 0) {
                    var $page = $("body");
                    var $app = $("#app");
                    right = $page.innerWidth() - $expressionLine.offset().left + 5
                }
                var newErrMsg = "<div class='error-message-box";
                if (isActive)newErrMsg += " active";
                newErrMsg += "' associatedExpressionId='{0}'></div>";
                $(String.format(newErrMsg, expressionId)).html(getErrorMessage(ar.errorList)).appendTo("body").css({
                    right: right,
                    top: $expressionLine.offset().top
                });
                autoWidthCanvasWrapper()
            }

            function autoWidthCanvasWrapper() {
                var $selectedDiv = $("#canvas").parent();
                var pageWidth = $selectedDiv.parent().innerWidth();
                var siblingWidth = $selectedDiv.next().outerWidth();
                var borderWidth = $selectedDiv.outerWidth() - $selectedDiv.width();
                var targetWidth = (pageWidth - siblingWidth - borderWidth);
                $selectedDiv.css("width", (targetWidth) + "px")
            }

            function autoSizeCanvasWrapper() {
                autoHeightCanvasWrapper();
                autoHeightControlPanel();
                autoWidthControls();
                autoWidthCanvasWrapper()
            }

            function controlPanelScrollBarWidth() {
                var $selectedDiv = $("#controls");
                return $selectedDiv.width() - exactInnerWidth($selectedDiv)
            }

            function autoHeightCanvasWrapper() {
                var $selectedDiv = $("#canvas").parent();
                var headerHeight = $("#header").outerHeight();
                var footerHeight = $("#footer").outerHeight();
                var parentBorderHeight = $selectedDiv.parent().parent().outerHeight() - $selectedDiv.parent().parent().height() + $selectedDiv.parent().outerHeight() - $selectedDiv.parent().height();
                var borderHeight = $selectedDiv.outerHeight() - $selectedDiv.height();
                var windowHeight = $(window).height();
                if ($("#main > #app").length > 0) {
                    windowHeight = $("#funGrapher").height()
                }
                $selectedDiv.css("height", (windowHeight - headerHeight - footerHeight - parentBorderHeight - borderHeight - 1) + "px")
            }

            function autoHeightControlPanel() {
                var $selectedDiv = $("#controls");
                var boderHeight = $selectedDiv.outerHeight() - $selectedDiv.height();
                $selectedDiv.css("height", ($selectedDiv.prev().outerHeight() - boderHeight) + "px")
            }

            function autoWidthControls() {
                var $selectedDiv = $("#controls");
                var $examples = $("#examples");
                var $title = $("#leftPanel .title");
                var borderWidth = controlPanelScrollBarWidth();
                if (borderWidth > 0) {
                    if (!addedWidth || addedWidth <= 0) {
                        $selectedDiv.css("width", ($selectedDiv.width() + borderWidth) + "px");
                        var right = parseInt($examples.css("right"));
                        $examples.css({right: (borderWidth + right) + "px"});
                        var titleRight = parseInt($title.css("right"));
                        $title.css({right: (borderWidth + titleRight) + "px"});
                        addedWidth = borderWidth
                    }
                } else {
                    $selectedDiv.css("width", ($selectedDiv.width() - addedWidth) + "px");
                    var right = parseInt($examples.css("right"));
                    $examples.css({right: (right - addedWidth) + "px"});
                    var titleRight = parseInt($title.css("right"));
                    $title.css({right: (titleRight - addedWidth) + "px"});
                    addedWidth = 0
                }
            }

            function exactInnerWidth(o) {
                var helperDiv = $("<div />");
                $(o).append(helperDiv);
                var innerWidthWithoutScrollBar = helperDiv.width();
                helperDiv.remove();
                return innerWidthWithoutScrollBar
            }

            function myKeyDown(event) {
                if (event.target != this)return;
                switch (event.which) {
                    case 13:
                        handleInput(this);
                        event.preventDefault();
                        addExpressionLine($(this).parent().parent().parent());
                        break;
                    case 8:
                        event.preventDefault();
                        var text = $(this).parent().parent().mathquill("latex");
                        if (text.length <= 0) {
                            var $target = $(this).parent().parent().parent().parent().prev().find("div.expressionBox span.mathquill-editable").focus();
                            if ($target.length > 0) {
                                setTimeout(function () {
                                    $target.find("textarea").focus()
                                }, 100);
                                deleteExpressionLine($(this))
                            } else {
                                if ($(this).parent().parent().parent().parent().next().find("div.expressionBox span.mathquill-editable").focus().length > 0) {
                                    setTimeout(function () {
                                        $(this).parent().parent().parent().parent().next().find("div.expressionBox span.mathquill-editable").find("textarea").focus()
                                    }, 100);
                                    deleteExpressionLine($(this))
                                }
                            }
                        }
                        break;
                    case 46:
                        var text = $(this).parent().parent().mathquill("latex");
                        if (text.length <= 0) {
                            event.preventDefault();
                            var $target = $(this).closest("div.expressionLine").next().find("div.expressionBox > span.mathquill-editable").focus();
                            if ($target.length > 0) {
                                setTimeout(function () {
                                    $target.find("textarea").focus()
                                }, 100);
                                deleteExpressionLine($(this))
                            } else {
                                if ($(this).closest("div.expressionLine").prev().find("div.expressionBox > span.mathquill-editable").focus().length > 0) {
                                    setTimeout(function () {
                                        $(this).closest("div.expressionLine").prev().find("div.expressionBox > span.mathquill-editable").find("textarea").focus()
                                    }, 100);
                                    deleteExpressionLine($(this))
                                }
                            }
                        }
                        break;
                    case 40:
                        event.stopPropagation();
                        if ($(this).closest("div.expressionLine").next().find("div.expressionBox > span.mathquill-editable").focus().length <= 0) {
                            addExpressionLine($(this).closest(".expressionBox"))
                        } else {
                            setTimeout(function () {
                                $(this).closest("div.expressionLine").next().find("div.expressionBox > span.mathquill-editable").find("textarea").focus()
                            }, 100)
                        }
                        break;
                    case 38:
                        var text = $(this).parent().parent().mathquill("latex");
                        if (text.length <= 0 && $(this).closest("div.expressionLine").next("div.expressionLine").length <= 0) {
                            event.preventDefault();
                            var $target = $(this).closest("div.expressionLine").prev().find("div.expressionBox > span.mathquill-editable").focus();
                            if ($target.length > 0) {
                                setTimeout(function () {
                                    $target.find("textarea").focus()
                                }, 100);
                                deleteExpressionLine($(this))
                            }
                        } else {
                            if ($(this).closest("div.expressionLine").prev().find("div.expressionBox > span.mathquill-editable").focus().length > 0) {
                                setTimeout(function () {
                                    $(this).closest("div.expressionLine").prev().find("div.expressionBox > span.mathquill-editable").find("textarea").focus()
                                }, 100);
                                event.stopPropagation()
                            }
                        }
                        break;
                    case 37:
                        break;
                    case 39:
                        break;
                    default:
                        break
                }
                $(this).closest("div.expressionLine").attr("expression", $(this).closest("span.mathquill-editable").mathquill("latex").trim())
            }

            function myKeyUp(event) {
                if (event.target != this)return;
                switch (event.which) {
                    case 13:
                        break;
                    default:
                        break
                }
                handleInput(event.target)
            }

            function myKeyPress(event) {
                handleInput(event.target)
            }

            function handleInput(input) {
                var oldExpression = $(input).closest("div.expressionLine").attr("expression");
                var newExpression = $(input).closest("span.mathquill-editable").mathquill("latex").trim();
                if (!oldExpression || oldExpression != newExpression) {
                    var analyzedResult = analyzeInput($(input).closest("span.mathquill-editable").mathquill("latex"));
                    if (analyzedResult.equationObject.type != "implicit function") {
                        handleAnalyzedResult(analyzedResult, $(input).closest("div.expressionLine"));
                        plotExpressionLine($(input).closest("div.expressionLine"))
                    } else {
                        basicHandleAnalyzedResult(analyzedResult, $(input).closest("div.expressionLine"))
                    }
                }
            }

            function myBlur(event) {
                if (event.target != this)return;
                var type = $(this).closest("div.expressionLine").attr("inputType");
                if (type == "implicit function") {
                    var data = $.parseJSON($(this).closest("div.expressionLine").attr("data"));
                    var oldExpression = $(this).closest("div.expressionLine").attr("plottedExpression");
                    var newExpression = $(this).closest("span.mathquill-editable").mathquill("latex").trim();
                    if (!data || !oldExpression || oldExpression != newExpression) {
                        var analyzedResult = analyzeInput($(this).closest("span.mathquill-editable").mathquill("latex"));
                        advancedHandleAnalyzedResult(analyzedResult, $(this).closest("div.expressionLine"));
                        $(this).closest("div.expressionLine").attr("plottedExpression", $(this).closest("span.mathquill-editable").mathquill("latex").trim())
                    }
                }
            }

            return {
                AddExpression: addExpression,
                AddExpressions: addExpressions,
                DeleteAllExpressionLines: deleteAllExpressionLines,
                ClearExpression: clearExpression,
                GetAllExpressions: getAllExpressions,
                ShowErrorStyle: showErrorStyle,
                RemoveErrorStyle: removeErrorStyle,
                PlotExpressionLine: plotExpressionLine,
                PlotAllExpressionBoxes: plotAllExpressionBoxes,
                DeleteErrorMessageBox: deleteErrorMessageBox,
                AutoPositionErrorMessageBox: autoPositionErrorMessageBox,
                AutoWidthCanvasWrapper: autoWidthCanvasWrapper,
                AutoSizeCanvasWrapper: autoSizeCanvasWrapper,
                ControlPanelScrollBarWidth: controlPanelScrollBarWidth,
                KeyDownHandler: myKeyDown,
                KeyUpHandler: myKeyUp,
                BlurHandler: myBlur,
                KeyPressHandler: myKeyPress
            }
        }();
        FunGrapher.ExamplePanel = function () {
        };
        FunGrapher.ExamplePanel.UI = function () {
            var $icon = $("#examples .indicator").find("span.icon");
            var $examples = $("#examples");
            var $content = $examples.find(".content");

            function hidePanel() {
                $icon.text("\uf31a");
                $examples.animate({right: (FunGrapher.UI.ControlPanelScrollBarWidth() - $content.outerWidth()) + "px"}, 500, function () {
                    $content.hide()
                })
            }

            function showPanel() {
                $icon.text("\uf31b");
                $content.show();
                $examples.animate({right: "0"}, 500)
            }

            return {HidePanel: hidePanel, ShowPanel: showPanel}
        }();
        FunGrapher.Example = function (expressions) {
            FunGrapher.ExamplePanel.UI.HidePanel();
            FunGrapher.UI.DeleteAllExpressionLines();
            FunGrapher.UI.AddExpressions(expressions)
        };
        FunGrapher.GetLink = function (currentLink) {
            var queryStart = currentLink.indexOf("?");
            var link = currentLink.substr(0, queryStart >= 0 ? queryStart : currentLink.length);
            var urlParams = zizhujy.com.deserializeUrlParams(currentLink.substring(queryStart >= 0 ? queryStart + 1 : currentLink.length));
            if (!urlParams) {
                urlParams = {}
            }
            var allExpressions = JSON.stringify(FunGrapher.UI.GetAllExpressions());
            urlParams.fns = encodeURIComponent("base64/" + btoa(allExpressions));
            link += "?{0}".format($.param(urlParams));
            return link
        };
        FunGrapher.EncodeExpressions = function (expressionsObject) {
            var flat = JSON.stringify(expressionsObject);
            flat = btoa(flat);
            flat = "base64/" + flat;
            flat = encodeURIComponent(flat);
            return flat
        };
        FunGrapher.DecodeExpressions = function (expressions) {
            if (expressions != null && typeof(expressions) === "string" && expressions !== "") {
                var object = decodeURIComponent(expressions);
                if (object.startsWith("base64/")) {
                    object = object.substring("base64/".length);
                    object = atob(object);
                    object = $.parseJSON(object);
                    return $.isArray(object) ? object : [object]
                } else {
                    object = LZString.decompress(object);
                    if (object != null && object !== "") {
                        object = $.parseJSON(object);
                        return $.isArray(object) ? object : [object]
                    } else {
                    }
                }
                return [expressions]
            } else {
                return $.isArray(expressions) ? expressions : [expressions]
            }
        };
        window.FunGrapher = FunGrapher;
        var addedWidth = 0;
        FunGrapher.UI.AutoSizeCanvasWrapper();
        var plot = null;
        var validViewPort = null;
        var isDrawing = true;
        var implicitCalculations = 0;
        var options = {
            lines: {show: true},
            zoom: {interactive: true},
            pan: {interactive: true, cursor: "move"},
            grid: {hoverable: true, clickable: true, show: false},
            colors: ["#421C52", "#FF0000", "#000099", "#990000", "#009900", "#edc240", "#afd8f8", "#cb4b4b", "#4da74d", "#9440ed"],
            canvas: true,
            legend: {
                labelFormatter: function (label, series) {
                    return ("<span class='mathquill-embedded-latex'>" + label.htmlEncode() + "</span>")
                }
            },
            coordinate: {type: 'auto', ratioXY: 1},
            xaxis: {show: false, reserveSpace: false, min: -10, max: 10},
            yaxis: {show: false, reserveSpace: false, min: -10, max: 10}
        };
        plot = $.plot("#canvas", [], options);
        $("#loading").hide();
        var coor = new zizhujy.com.GeneralRectangularCoordinate(plot.getOptions().xaxis.min, plot.getOptions().xaxis.max, plot.getOptions().yaxis.min, plot.getOptions().yaxis.max, plot.width(), plot.height());
        var pixelWidth = coor.pixelWidth;
        var pixelHeight = coor.pixelHeight;
        validViewPort = {
            left: plot.getOptions().xaxis.min,
            right: plot.getOptions().xaxis.max,
            bottom: plot.getOptions().yaxis.min,
            top: plot.getOptions().yaxis.max
        };
        $("div.expressionLine span.mathquill-editable").focus();
        setTimeout(function () {
            $("div.expressionLine span.mathquill-editable").find("textarea").focus()
        }, 100);
        $("#mask-layer").click(function () {
        });
        replotAll();
        $(window).resize(function () {
            FunGrapher.UI.AutoSizeCanvasWrapper();
            FunGrapher.UI.AutoPositionErrorMessageBox()
        });
        function replotJob() {
            if (!!isDrawing) {
            } else {
                var currentViewPort = {
                    left: plot.getOptions().xaxis.min,
                    right: plot.getOptions().xaxis.max,
                    bottom: plot.getOptions().yaxis.min,
                    top: plot.getOptions().yaxis.max
                };
                if (!validViewPort || currentViewPort.left < validViewPort.left || currentViewPort.right > validViewPort.right || currentViewPort.top > validViewPort.top || currentViewPort.bottom < validViewPort.bottom) {
                    replotAll()
                } else {
                    var curCoor = new zizhujy.com.GeneralRectangularCoordinate(plot.getOptions().xaxis.min, plot.getOptions().xaxis.max, plot.getOptions().yaxis.min, plot.getOptions().yaxis.max, plot.width(), plot.height());
                    var curPixelWidth = curCoor.pixelWidth;
                    var curPixelHeight = curCoor.pixelHeight;
                    if ((curPixelWidth < pixelWidth / 3 || curPixelHeight < pixelHeight / 3)) {
                        replotAll()
                    } else {
                    }
                }
            }
            function containsImplicitFunction() {
                var data = plot.getData();
                for (var i = 0; i < data.length; i++) {
                    if (data[i].type == "implicit function") {
                        return true
                    }
                }
                return false
            }

            setTimeout(function () {
                replotJob()
            }, 2000)
        }

        replotJob();
        $("#canvas").bind("plotzoom", function (event, plot) {
        });
        var $mathquill = $(".expressionBox > span.mathquill-editable textarea, .expressionBox > span.mathquill-editable input");
        $mathquill.bind("keydown", FunGrapher.UI.KeyDownHandler).bind("keyup", FunGrapher.UI.KeyUpHandler).bind("blur", FunGrapher.UI.BlurHandler);
        var ua = navigator.userAgent.toLowerCase();
        var isAndroid = ua.indexOf("android") >= 0;
        if (isAndroid) {
            $mathquill.bind("keypress", FunGrapher.UI.KeyPressHandler)
        }
        $("table.errorList tbody tr").live("click", function () {
            $(this).siblings().removeClass("selected");
            if (!$(this).hasClass("selected"))$(this).addClass("selected")
        }).live("dblclick", function () {
        });
        $("#leftPanel").scroll(function () {
            FunGrapher.UI.AutoPositionErrorMessageBox()
        });
        function analyzeInput(s) {
            var ar = {isValid: false, status: "not_started_yet", errorList: [], equationObject: {type: "unknown"}};
            parser.init(s);
            parser.run();
            var tree = parser.tree;
            ar.errorList = parser.errorList;
            ar.isValid = parser.errorList.length <= 0;
            ar.status = "completed";
            if (ar.isValid && !!tree) {
                if (tree.children.length == 3 || tree.children.length == 4) {
                    if (tree.children[0].getLeaves().length == 1 && tree.children[0].getLeaves()[0].nodeType == parser.nodeTypeEnum.VARIABLE_NAME) {
                        if (tree.children[0].getLeaves()[0].expression == "y" && !tree.children[2].getLeaves().filter(function (item) {
                                return item.nodeType == parser.nodeTypeEnum.VARIABLE_NAME
                            }).map(function (item) {
                                return item.expression
                            }).contains("y")) {
                            ar.equationObject.type = "explicit function y = f(x)"
                        } else if (tree.children[0].getLeaves()[0].expression == "x" && !tree.children[2].getLeaves().filter(function (item) {
                                return item.nodeType == parser.nodeTypeEnum.VARIABLE_NAME
                            }).map(function (item) {
                                return item.expression
                            }).contains("x")) {
                            ar.equationObject.type = "explicit function x = f(y)"
                        } else {
                            ar.equationObject.type = "implicit function"
                        }
                    } else if (tree.children[2].getLeaves().length == 1 && tree.children[2].getLeaves()[0].nodeType == parser.nodeTypeEnum.VARIABLE_NAME) {
                        if (tree.children[2].getLeaves()[0].expression == "y" && !tree.children[0].getLeaves().filter(function (item) {
                                return item.nodeType == parser.nodeTypeEnum.VARIABLE_NAME
                            }).map(function (item) {
                                return item.expression
                            }).contains("y")) {
                            ar.equationObject.type = "explicit function f(x) = y"
                        } else if (tree.children[2].getLeaves()[0].expression == "x" && !tree.children[0].getLeaves().filter(function (item) {
                                return item.nodeType == parser.nodeTypeEnum.VARIABLE_NAME
                            }).map(function (item) {
                                return item.expression
                            }).contains("x")) {
                            ar.equationObject.type = "explicit function f(y) = x"
                        } else {
                            ar.equationObject.type = "implicit function"
                        }
                    } else if (tree.children[0].nodeType == parser.nodeTypeEnum.EXPRESSION && tree.children[1].expression == "=" && tree.children[2].nodeType == parser.nodeTypeEnum.EXPRESSION) {
                        ar.equationObject.type = "implicit function"
                    }
                } else if (tree.children.length >= 7 && tree.children[3].getLeaves().length == 1 && tree.children[3].getLeaves()[0].expression == ";") {
                    ar.equationObject.type = "parameter function x=f(t);y=g(t)"
                }
            }
            $.extend(ar.equationObject, {
                generateData: function () {
                    return sampleEquation(ar.equationObject.type, tree, plot.width(), plot.height(), plot.getAxes().xaxis.options.min, plot.getAxes().xaxis.options.max, plot.getAxes().yaxis.options.min, plot.getAxes().yaxis.options.max, 500, !!tree ? parser.getConstraints(tree) : null)
                }
            });
            function sampleEquation(type, tree, viewPortWidth, viewPortHeight, xStart, xEnd, yStart, yEnd, dataPoints, constraints) {
                var data = [];
                var ytolerance = (yEnd - yStart) / viewPortHeight;
                var xtolerance = (xEnd - xStart) / viewPortWidth;
                var xMin = xStart, xMax = xEnd, yMin = yStart, yMax = yEnd;
                if (!!constraints && typeof constraints.x != "undefined") {
                    if (typeof constraints.x[0] != "undefined" && !!constraints.x[0])xMin = eval(constraints.x[0]);
                    if (typeof constraints.x[1] != "undefined" && !!constraints.x[1])xMax = eval(constraints.x[1])
                }
                if (!!constraints && !!constraints.y) {
                    if (typeof constraints.y[0] != "undefined" && !!constraints.y[0])yMin = eval(constraints.y[0]);
                    if (typeof constraints.y[1] != "undefined" && !!constraints.y[1])yMax = eval(constraints.y[1])
                }
                switch (type) {
                    case"explicit function y = f(x)":
                        var step = (xMax - xMin) / dataPoints;
                        var independentVar = tree.children[2].getLeaves().filter(function (node) {
                            return node.nodeType == parser.nodeTypeEnum.VARIABLE_NAME
                        });
                        if (!!independentVar && independentVar.length > 0)independentVar = independentVar[0].expression; else {
                            independentVar = "x"
                        }
                        var dependentVar = tree.children[0].getLeaves().filter(function (node) {
                            return node.nodeType == parser.nodeTypeEnum.VARIABLE_NAME
                        });
                        if (!!dependentVar && dependentVar.length > 0)dependentVar = dependentVar[0].expression; else {
                            dependentVar = "y"
                        }
                        data = Plotter.sampleXY(function (x) {
                            return eval(tree.children[2].eval())
                        }, {min: xMin, max: xMax, step: step, ytolerance: ytolerance});
                        break;
                    case"explicit function x = f(y)":
                        var step = (yMax - yMin) / dataPoints;
                        var independentVar = tree.children[2].getLeaves().filter(function (node) {
                            return node.nodeType == parser.nodeTypeEnum.VARIABLE_NAME
                        });
                        if (!!independentVar && independentVar.length > 0)independentVar = independentVar[0].expression; else {
                            independentVar = "y"
                        }
                        var dependentVar = tree.children[0].getLeaves().filter(function (node) {
                            return node.nodeType == parser.nodeTypeEnum.VARIABLE_NAME
                        });
                        if (!!dependentVar && dependentVar.length > 0)dependentVar = dependentVar[0].expression; else {
                            dependentVar = "x"
                        }
                        data = Plotter.sampleXY(function (y) {
                            return eval(tree.children[2].eval())
                        }, {min: yMin, max: yMax, step: step, tolerance: xtolerance}).swapCols(0, 1);
                        break;
                    case"explicit function f(x) = y":
                        var step = (xMax - xMin) / dataPoints;
                        var independentVar = tree.children[0].getLeaves().filter(function (node) {
                            return node.nodeType == parser.nodeTypeEnum.VARIABLE_NAME
                        });
                        if (!!independentVar && independentVar.length > 0)independentVar = independentVar[0].expression; else {
                            independentVar = "x"
                        }
                        var dependentVar = tree.children[2].getLeaves().filter(function (node) {
                            return node.nodeType == parser.nodeTypeEnum.VARIABLE_NAME
                        });
                        if (!!dependentVar && dependentVar.length > 0)dependentVar = dependentVar[0].expression; else {
                            dependentVar = "y"
                        }
                        data = Plotter.sampleXY(function (x) {
                            return eval(tree.children[0].eval())
                        }, {min: xMin, max: xMax, step: step, ytolerance: ytolerance});
                        break;
                    case"explicit function f(y) = x":
                        var step = (yMax - yMin) / dataPoints;
                        var independentVar = tree.children[0].getLeaves().filter(function (node) {
                            return node.nodeType == parser.nodeTypeEnum.VARIABLE_NAME
                        });
                        if (!!independentVar && independentVar.length > 0)independentVar = independentVar[0].expression; else {
                            independentVar = "y"
                        }
                        var dependentVar = tree.children[2].getLeaves().filter(function (node) {
                            return node.nodeType == parser.nodeTypeEnum.VARIABLE_NAME
                        });
                        if (!!dependentVar && dependentVar.length > 0)dependentVar = dependentVar[0].expression; else {
                            dependentVar = "x"
                        }
                        data = Plotter.sampleXY(function (y) {
                            return eval(tree.children[0].eval())
                        }, {min: yMin, max: yMax, step: step, tolerance: xtolerance}).swapCols(0, 1);
                        break;
                    case"parameter function x=f(t);y=g(t)":
                        var independentVar = tree.children[2].getLeaves().filter(function (node) {
                            return node.nodeType == parser.nodeTypeEnum.VARIABLE_NAME
                        });
                        if (!!independentVar && independentVar.length > 0)independentVar = independentVar[0].expression; else independentVar = "t";
                        var varX = tree.children[0].getLeaves().filter(function (node) {
                            return node.nodeType == parser.nodeTypeEnum.VARIABLE_NAME
                        });
                        if (!!varX && varX.length > 0)varX = varX[0].expression; else varX = "x";
                        var varY = tree.children[4].getLeaves().filter(function (node) {
                            return node.nodeType == parser.nodeTypeEnum.VARIABLE_NAME
                        });
                        if (!!varY && varY.length > 0)varY = varY[0].expression; else varY = "y";
                        var tMin = 0, tMax = Math.PI * 2;
                        if (!!constraints && !!constraints.t) {
                            if (typeof constraints.t[0] != "undefined" && !!constraints.t[0])tMin = eval(constraints.t[0]);
                            if (typeof constraints.t[1] != "undefined" && !!constraints.t[1])tMax = eval(constraints.t[1])
                        }
                        var step = (tMax - tMin) / dataPoints;
                        data = Plotter.sampleTXY(function (t) {
                            return eval(tree.children[2].eval())
                        }, function (t) {
                            return eval(tree.children[6].eval())
                        }, {min: tMin, max: tMax, step: step, tolerance: Math.min(xtolerance, ytolerance)});
                        break;
                    case"implicit function":
                        var offset = plot.getPlotOffset();
                        var debug = !(typeof zizhujy.com.deserializeUrlParams().debug === "undefined");
                        data = Plotter.sampleImplicit(function (u) {
                            var result = {val: [false, true], def: [true, true]};
                            var x = u.xRange;
                            var y = u.yRange;
                            var left = tree.children[0].intervalEval();
                            var right = tree.children[2].intervalEval();
                            left = eval("left = " + left);
                            right = eval("right = " + right);
                            if (tree.children[1].getExpression() == "=") {
                                var r1 = IntervalArithmetic.greaterThan(left, right);
                                var r2 = IntervalArithmetic.greaterThan(right, left);
                                r1 = IntervalArithmetic.not(r1);
                                r2 = IntervalArithmetic.not(r2);
                                result = IntervalArithmetic.and(r1, r2);
                                return result
                            } else {
                                var r1 = IntervalArithmetic.greaterThan(left, right);
                                var r2 = IntervalArithmetic.greaterThan(right, left);
                                r1 = IntervalArithmetic.not(r1);
                                r2 = IntervalArithmetic.not(r2);
                                result = IntervalArithmetic.and(r1, r2);
                                return result
                            }
                        }, xStart, xEnd, yStart, yEnd, offset.left, viewPortWidth + offset.left, offset.top + viewPortHeight, offset.top, plot.getCanvas().getContext("2d"), {
                            xMin: xMin,
                            xMax: xMax,
                            yMin: yMin,
                            yMax: yMax
                        }, debug);
                        break;
                    default:
                        break
                }
                return data
            }

            return ar
        }

        function replotAll() {
            $("div.expressionLine").each(function (i) {
                var analyzedResult = analyzeInput($(this).find("span.mathquill-editable").mathquill("latex"));
                handleAnalyzedResult(analyzedResult, $(this))
            });
            FunGrapher.UI.PlotAllExpressionBoxes()
        }

        function basicHandleAnalyzedResult(ar, $expressionLine) {
            if (ar.isValid) {
                FunGrapher.UI.RemoveErrorStyle($expressionLine);
                $expressionLine.attr("inputType", ar.equationObject.type)
            } else {
                FunGrapher.UI.ShowErrorStyle($expressionLine, ar);
                $expressionLine.removeAttr("data");
                $expressionLine.removeAttr("inputType")
            }
        }

        function advancedHandleAnalyzedResult(ar, $expressionLine) {
            isDrawing = true;
            function handle() {
                var data;
                try {
                    data = ar.equationObject.generateData()
                } finally {
                    implicitCalculations--;
                    if (implicitCalculations == 0) {
                        $("#mask-layer").hide()
                    }
                }
                $expressionLine.attr("data", JSON.stringify(data))
            }

            if (ar.isValid) {
                $expressionLine.removeClass("error");
                $expressionLine.attr("inputType", ar.equationObject.type);
                var type = ar.equationObject.type;
                if (type == "implicit function") {
                    $("#mask-layer").show();
                    implicitCalculations++;
                    setTimeout(function () {
                        handle();
                        FunGrapher.UI.PlotExpressionLine($expressionLine)
                    }, 200)
                } else {
                    $("#mask-layer").show();
                    implicitCalculations++;
                    handle()
                }
            } else {
                $expressionLine.addClass("error");
                $expressionLine.removeAttr("data");
                $expressionLine.removeAttr("inputType")
            }
        }

        function handleAnalyzedResult(ar, $expressionLine) {
            isDrawing = true;
            function handle() {
                var data;
                try {
                    data = ar.equationObject.generateData()
                } finally {
                    $expressionLine.find("span.mathquill-editable").focus();
                    setTimeout(function () {
                        $expressionLine.find("span.mathquill-editable").find("textarea").focus()
                    }, 100)
                }
                $expressionLine.attr("data", JSON.stringify(data))
            }

            basicHandleAnalyzedResult(ar, $expressionLine);
            if (ar.isValid) {
                var type = ar.equationObject.type;
                if (type == "implicit function") {
                    advancedHandleAnalyzedResult(ar, $expressionLine)
                } else {
                    handle()
                }
            }
        }

        function s4() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
        }

        function guid() {
            return (s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4())
        }

        function getErrorMessage(errorList) {
            var errorDataTable = new zizhujy.com.DataTable;
            errorDataTable.clear();
            errorDataTable.columns.add("#");
            errorDataTable.columns.add(Globalize.localize("Remark"));
            errorDataTable.columns.add(Globalize.localize("Context"));
            errorDataTable.columns.add(Globalize.localize("Index"));
            for (var i = 0; i < errorList.length; i++) {
                var error = errorList[i];
                var errorMsg = "";
                if (error.errorEnum instanceof Array) {
                    var sb = new StringBuffer;
                    for (var j = 0; j < error.errorEnum.length; j++) {
                        sb.append(error.errorEnum[j].message)
                    }
                    errorMsg = sb.toString(Globalize.localize("Or"))
                } else {
                    errorMsg = error.errorEnum.message
                }
                errorDataTable.rows.add((i + 1).toString(), errorMsg, error.contextHTML, error.index.toString())
            }
            return errorDataTable.toHtml("errorList", false, Globalize.localize("ErrorList"))
        }

        $("div.error-icon-box").live("click", function (event) {
            var expressionId = $(this).closest("div.expressionLine").find("div.expressionBox").attr("id");
            $(String.format("div.error-message-box[associatedExpressionId='{0}']", expressionId)).toggleClass("active")
        }).live("mouseover", function (event) {
            var expressionId = $(this).closest("div.expressionLine").find("div.expressionBox").attr("id");
            $(String.format("div.error-message-box[associatedExpressionId='{0}']", expressionId)).show()
        }).live("mouseout", function (event) {
            var expressionId = $(this).closest("div.expressionLine").find("div.expressionBox").attr("id");
            var $errorBox = $(String.format("div.error-message-box[associatedExpressionId='{0}']", expressionId));
            if (!$errorBox.hasClass("active"))$errorBox.hide()
        });
        $(".expressionBox .clear").live("click", function (event) {
            FunGrapher.UI.ClearExpression($(this))
        });
        $("#examples .indicator").click(function (event) {
            var $icon = $(this).find("span.icon");
            var $examples = $("#examples");
            var $content = $examples.find(".content");
            var text = $icon.text();
            if (text == "\uf31a") {
                FunGrapher.ExamplePanel.UI.ShowPanel()
            } else {
                FunGrapher.ExamplePanel.UI.HidePanel()
            }
        });
        $("#example-link").click(function (event) {
            FunGrapher.ExamplePanel.UI.ShowPanel()
        });
        $("#btnClearAll").click(function (event) {
            FunGrapher.UI.DeleteAllExpressionLines()
        });
        var urlParams = zizhujy.com.deserializeUrlParams(window.location.search.substr(1));
        if (urlParams && urlParams.examples) {
            FunGrapher.ExamplePanel.UI.ShowPanel()
        }
        var ua = navigator.userAgent.toLowerCase();
        var isAndroid = ua.indexOf("android") >= 0;
        if (isAndroid) {
            $("#leftPanel .title").css({position: "relative", right: "auto"});
            $("#leftPanel .title ~ .placeHolder").remove()
        }
    })
})(jQuery, zizhujy.com.Console, zizhujy.com.LaTexLex, zizhujy.com.LaTexParser, zizhujy.com.TupperIntervalArithmetic)
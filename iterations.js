function Ui(canvas) {
    const defaultColor = "black";
    const textSize = 12;
    const defaultFont = `${textSize}px Georgia`;
    const finishXRelativeMargin = 1/5;
    const startXRelativeMargin = 1/5;
    let canvasContext, xUsableSpace, yUsableSpace, startXmargin, finishXmargin;

    const loadUi = () => {
        startXmargin = canvas.width * startXRelativeMargin;
        finishXmargin = canvas.width * finishXRelativeMargin;
        xUsableSpace = canvas.width - startXmargin - finishXmargin;
        yUsableSpace = canvas.height;
        canvasContext = canvas.getContext("2d");
    }
    
    const drawLine = (from, to, color = defaultColor) => {
        canvasContext.beginPath();
        canvasContext.moveTo(from.x, from.y);
        canvasContext.lineTo(to.x, to.y);
        canvasContext.strokeStyle = color;
        canvasContext.stroke();
    }

    const drawCircle = (center, radius, fill = defaultColor) => {
        canvasContext.beginPath();
        canvasContext.arc(center.x, center.y, radius, 0, 2* Math.PI);
        canvasContext.fillStyle = fill;
        canvasContext.fill();
    }

    const writeText = (bottomRight, text, color = defaultColor, font = defaultFont) => {
        canvasContext.font = defaultFont;
        canvasContext.fillStyle = color;
        canvasContext.fillText(text, bottomRight.x, bottomRight.y);
    }

    const clearCanvas = () => {
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    }

    const initCanvas = (parameters) => {
        const goalSize = parameters.goal * parameters.goalSizePercent / 100
        const startCenter = {x: startXmargin, y: canvas.height / 2};
        const finishCenter = { x: canvas.width - finishXmargin, y: canvas.height / 2 };
        const startRadius = 5;
        const finishRadius = scaleX(goalSize, parameters.goal);
        clearCanvas();
        drawLine(startCenter, finishCenter, "#ccc");
        drawCircle(startCenter, startRadius, "red");
        writeText({x: startXmargin, y: canvas.height / 2 - startRadius - 5}, "Start", "red");
        drawCircle(finishCenter, finishRadius,"green");
        writeText({x: canvas.width - finishXmargin - 20
            , y: canvas.height / 2 - finishRadius - 5},
            "Finish", 
            "green");
    }

    const scaleX = (x, xmax) => (x / xmax) * xUsableSpace;
    const offsetX = (x) => x + startXmargin;
    const scaleY = (y, ymax) => (y / ymax) * yUsableSpace;
    const offsetY = (y) => (y + yUsableSpace / 2) % yUsableSpace;
    const scale = (point, maximums) => ({
        x: offsetX(scaleX(point.x, maximums.x)),
        y: offsetY(scaleY(point.y, maximums.y))
    });

    const drawProgress = (from, to, maximums, color) => {
        const scaledFrom = scale(from, maximums);
        const scaledTo = scale(to, maximums);
        drawLine(scaledFrom, scaledTo, color);
        previousProgress = to;
    }

    loadUi();

    return {
        init: initCanvas,
        drawProgress: drawProgress,
        screenRatio: xUsableSpace / yUsableSpace
    };
}

function textUpdater(element) {
    return (state) => {
        element.innerHTML = `
            Cycle length (days): ${state.playerParameters.cycleLengthInDays}. 
            Iteration: ${state.iteration}. 
            DistanceToFinish: ${Math.round(state.distanceToFinish)}. 
            Days: ${state.day}.`;
    }
}

function generateDirectionForNextIteration(interpretationPercent) {
    const directionUnderstoodFromCustomer = gaussianRand() * Math.PI;
    const misinterpretationPercent = (100 - interpretationPercent) / 100;
    const misinterpretationFromCustomer = 2 * Math.PI * misinterpretationPercent * (Math.random() - .5);
    return directionUnderstoodFromCustomer + misinterpretationFromCustomer;
} 

function updatePosition(cycleLength, interpretationPercent) {
    return (pos, goal) => {
        const directionToGoal = Math.atan2(goal.y - pos.y, goal.x - pos.x);
        const distanceToGoal = distance(pos, goal);
        const directionForNextIteration = generateDirectionForNextIteration(interpretationPercent) + directionToGoal;
        const progressInThisCycle = cycleLength < distanceToGoal ? cycleLength : distanceToGoal;
        return {
                x: pos.x + Math.cos(directionForNextIteration) * progressInThisCycle,
                y: pos.y + Math.sin(directionForNextIteration) * progressInThisCycle
            };
        };
}

function distance(pt1, pt2) {
    return Math.sqrt(Math.pow(pt1.x - pt2.x, 2) + Math.pow(pt1.y - pt2.y, 2));
}

function loadTick(gameParameters, playerParameters) {
    const goal = { x: gameParameters.goal, y: 0 };
    const goalSize = gameParameters.goal * gameParameters.goalSizePercent / 100;
    const maxY = goal.x / gameParameters.ui.screenRatio;
    const state = {
        currentPos: {x: 0, y: 0},
        distanceToFinish: 0,
        gameParameters,
        playerParameters,
        prevPos: {x: 0, y: 0},
        iteration: 0,
        day: 0,
        maximums: { x: goal.x, y: maxY }
    }

    const positionUpdater = updatePosition(
        playerParameters.cycleLengthInDays, 
        gameParameters.interpretationPercent);

    const tick = (day) => {
        state.day = day;
        if (day % playerParameters.cycleLengthInDays === 0) {
            state.iteration++;
            state.prevPos = state.currentPos;
            state.currentPos = positionUpdater(state.currentPos, goal);
            gameParameters.ui.drawProgress(state.prevPos, state.currentPos, state.maximums, playerParameters.color);
            state.distanceToFinish = distance(state.currentPos, goal);
            playerParameters.callback(state);
        }
        return state.distanceToFinish >= goalSize;
    }
    return tick;
}

function loop(ticks, periodMs, day = 0) {
    let remainingTicks = ticks.filter((tick) => tick(day));
    if (remainingTicks.length > 0) {
        setTimeout(() => loop(remainingTicks, periodMs, day + 1), periodMs);
    }
}


// Box-muller transform from https://jsfiddle.net/ssell/qzzvruc4/
function gaussianRand() {
    this.generate = true;
    this.value0 = 0.0;
    this.value1 = 0.0;
    
    if (this.generate) {
        let x1 = 0.0, x2 = 0.0, w  = 0.0;
        do {
            x1 = (2.0 * Math.random()) - 1.0;
            x2 = (2.0 * Math.random()) - 1.0;
            w  = (x1 * x1) + (x2 * x2);
        } while(w >= 1.0);
        w = Math.sqrt((-2.0 * Math.log(w)) / w);
        this.value0 = x1 * w;
        this.value1 = x2 * w;
        result = this.value0;
    } else {
        result = this.value1;
    }
    this.generate = !this.generate
    return (result / 3.6);
}

const colorComponents = "ABC0123456789";
const generateColor = () => {
    let res = "#";
    for (let i = 0; i < 6; i++) {
        res += colorComponents[Math.floor(Math.random() * colorComponents.length)];
    }
    return res;
}

const addPlayer = (color, cycleLengthInDays) => {
    const parentElement = document.getElementById("results");
    const element = document.createElement("div");
    element.style = `color: ${color}`;
    parentElement.appendChild(element);
    const gameParameters = { cycleLengthInDays, color, callback: textUpdater(element) };
    return gameParameters;
}

function start(gameParameters, cycleLengths) {
    gameParameters.ui = Ui(gameParameters.canvas);
    gameParameters.ui.init(gameParameters);
    gameParameters.results.innerHTML = "";
    const ticks = cycleLengths.map((cycleLength) => loadTick(gameParameters, addPlayer(generateColor(), cycleLength)));
    loop(ticks, 10);
}

function addInput(parentElement, preCaption, postCaption, properties) {
    const element = document.createElement("p");
    parentElement.appendChild(element);
    const preCaptionElement = document.createElement("span");
    element.appendChild(preCaptionElement);
    preCaptionElement.innerHTML = preCaption;
    const input = document.createElement("input");
    element.appendChild(input);
    for(let propertyName in properties) {
        input[propertyName] = properties[propertyName];
    }
    const postCaptionElement = document.createElement("span");
    element.appendChild(postCaptionElement);
    postCaptionElement.innerHTML = postCaption;
    return input;
}

function load(rootElement) {
    const configurationElement = document.createElement("div");
    rootElement.appendChild(configurationElement);

    const goalInput = addInput(configurationElement,
        "If things were perfect the project would take ",
        " days.",
        {
            type: "number", min: 1,
            value: 100
        });
    
    const goalSizeInput = addInput(configurationElement,
            "The customer needs a result within ",
            "% of their scope (this is the size of your goal)",
            {
                type: "number", min: 1, max: 90,
                value: 10
            });

    const cycleTimesInput = addInput(configurationElement,
        "I want to see cycles ",
        " day-long (comma separated list)",
        {
            type: "text",
            value: "1, 7, 14, 31"
        });

    const interpretationPercentInput = addInput(configurationElement, 
        "What I understand from the customer is ",
        "% what they actually need (level of randomness)",
        { 
            type: "number", min: 0, max: 100,
            value: 100
        });

    const startButton = document.createElement("button");
    configurationElement.appendChild(startButton);
    startButton.innerHTML = "Start";

    const canvas = document.createElement("canvas");
    rootElement.appendChild(canvas);
    canvas.width = 700;
    canvas.height = 350;
    canvas.style = "border: 1pt solid grey";

    const results = document.createElement("div");
    rootElement.appendChild(results);
    results.id = "results";

    startButton.onclick = () => {
        const goal = goalInput.value;
        const goalSizePercent = goalSizeInput.value;
        const cycleLengths = cycleTimesInput.value.split(",").map((val) => val.trim());
        const interpretationPercent = interpretationPercentInput.value;
        start( {
            canvas,
            results,
            goal,
            goalSizePercent,
            interpretationPercent
         },
            cycleLengths);
    }
}
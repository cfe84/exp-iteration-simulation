function Ui() {
    const defaultColor = "black";
    const textSize = 12;
    const defaultFont = `${textSize}px Georgia`;
    const margin = 10;
    let canvas, canvasContext, xUsableSpace, yUsableSpace;

    loadUi = () => {
        canvas = document.getElementById("canvas");
        xUsableSpace = canvas.width / 2 - 2 * margin;
        yUsableSpace = canvas.height - 2 * margin;
        canvasContext = canvas.getContext("2d");
        // Todo
    }
    
    drawLine = (from, to, color = defaultColor) => {
        canvasContext.beginPath();
        canvasContext.moveTo(from.x, from.y);
        canvasContext.lineTo(to.x, to.y);
        canvasContext.strokeStyle = color;
        canvasContext.stroke();
    }

    drawCircle = (center, radius, fill = defaultColor) => {
        canvasContext.beginPath();
        canvasContext.arc(center.x, center.y, radius, 0, 2* Math.PI);
        canvasContext.fillStyle = fill;
        canvasContext.fill();
    }

    writeText = (bottomRight, text, color = defaultColor, font = defaultFont) => {
        canvasContext.font = defaultFont;
        canvasContext.fillStyle = color;
        canvasContext.fillText(text, bottomRight.x, bottomRight.y);
    }

    clearCanvas = () => {
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    }

    initCanvas = () => {
        clearCanvas();
        drawCircle({x: margin, y: canvas.height / 2}, 5, "red");
        writeText({x: margin, y: canvas.height / 2 - 10}, "Start", "red");
        drawCircle(
            { x: canvas.width / 2 - margin - 10, y: canvas.height / 2 - margin },
            20,
            "green");
        writeText({x: canvas.width / 2 - margin - 27, y: canvas.height / 2 - 35},
            "Finish", 
            "green");
    }

    scaleX = (x, xmax) => (x / xmax) * xUsableSpace + margin;
    scaleY = (y, ymax) => (((y / ymax) + 1) * yUsableSpace / 2) % yUsableSpace;
    scale = (point, maximums) => ({
        x: scaleX(point.x, maximums.x),
        y: scaleY(point.y, maximums.y)
    });

    drawProgress = (from, to, maximums, color) => {
        const scaledFrom = scale(from, maximums);
        const scaledTo = scale(to, maximums);
        drawLine(scaledFrom, scaledTo, color);
        previousProgress = to;
    }

    loadUi();

    return {
        init: initCanvas,
        drawProgress: drawProgress,
        screenRatio: (canvas.width - 2 * margin) / (canvas.height - 2 * margin)
    };
}

function textUpdater(element) {
    return (state) => {
        element.innerHTML = `Color: ${state.color}. Frequency: ${state.frequency}. Iteration: ${state.iteration}. DistanceToFinish: ${Math.round(state.distanceToFinish)}. Days: ${state.day}.`;
    }
}

function updatePosition(cycleLength, generateDirectionForNextIteration = () => gaussianRand()* Math.PI) {
    return (pos, goal) => {
        const directionToGoal = Math.atan2(goal.y - pos.y, goal.x - pos.x);
        const directionForNextIteration = generateDirectionForNextIteration() + directionToGoal;
        return {
                x: pos.x + Math.cos(directionForNextIteration) * cycleLength,
                y: pos.y + Math.sin(directionForNextIteration) * cycleLength
            };
        };
}

function distance(pt1, pt2) {
    return Math.sqrt(Math.pow(pt1.x - pt2.x, 2) + Math.pow(pt1.y - pt2.y, 2));
}

function loadTick(ui, directionGenerator, cycleLengthInDays, color, callback) {
    const goal = { x: 1000, y: 0 };
    const goalSize = 35;
    const maxY = goal.x / ui.screenRatio;
    const state = {
        currentPos: {x: 0, y: 0},
        distanceToFinish: 0,
        frequency: cycleLengthInDays,
        color,
        prevPos: {x: 0, y: 0},
        iteration: 0,
        day: 0,
        goal: goal,
        maximums: { x: goal.x, y: maxY }
    }

    const positionUpdater = updatePosition(cycleLengthInDays, directionGenerator);

    const tick = (day) => {
        state.day = day;
        state.distanceToFinish = distance(state.currentPos, goal);
        if (day % cycleLengthInDays === 0) {
            state.iteration++;
            state.prevPos = state.currentPos;
            state.currentPos = positionUpdater(state.currentPos, goal);
            ui.drawProgress(state.prevPos, state.currentPos, state.maximums, color);
            callback(state);
        }
        return state.distanceToFinish > goalSize;
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
    this.value0   = 0.0;
    this.value1   = 0.0;
    
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

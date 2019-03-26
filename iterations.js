function Ui() {
    const defaultColor = "black";
    const textSize = 12;
    const defaultFont = `${textSize}px Georgia`;
    const margin = 10;
    let canvas, canvasContext, xUsableSpace, yUsableSpace;

    loadUi = () => {
        canvas = document.getElementById("canvas");
        xUsableSpace = canvas.width - 2 * margin;
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
        //canvasContext.endPath();
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
        previousProgress = {x: 0, y: 0};
        clearCanvas();
        drawCircle({x: margin, y: canvas.height / 2}, 5, "red");
        writeText({x: margin, y: canvas.height / 2 - 10}, "Start", "red");
        drawLine(
            { x: canvas.width - margin, y: margin},
            { x: canvas.width - margin, y: canvas.height - margin },
            "green");
        writeText({x: canvas.width - margin - 40, y: canvas.height / 2 - 10},
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
    // .initCanvas();
    // .drawProgress({x: 0, y: 0}, {x: 5, y: -5}, {x: 10, y: 10}, "red");
    // .drawProgress({x: 5, y: -5}, {x: 10, y: 0}, {x: 10, y: 10}, "green");


    return {
        init: initCanvas,
        drawProgress: drawProgress,
        screenRatio: (canvas.width - 2 * margin) / (canvas.height - 2 * margin)
    };
}

function textUpdater(element) {
    return (state) => {
        element.innerHTML = `Color: ${state.color}. Frequency: ${state.frequency}. Iteration: ${state.iteration}. Progress: ${Math.round(state.currentPos.x)}. Days: ${state.day}`;
    }
}

function loadTick(ui, algorithm, frequency, color, callback) {
    const goal = 200;
    const maxY = goal / ui.screenRatio;
    const state = {
        currentPos: {x: 0, y: 0},
        frequency,
        color,
        prevPos: {x: 0, y: 0},
        iteration: 0,
        day: 0,
        goal: goal,
        maximums: { x: goal, y: maxY }
    }

    const tick = (day) => {
        state.day = day;
        if (day % frequency === 0) {
            state.iteration++;
            state.prevPos = state.currentPos;
            state.currentPos = algorithm(state.currentPos);
            ui.drawProgress(state.prevPos, state.currentPos, state.maximums, color);
            callback(state);
        }
        return state.currentPos.x < state.goal;
    }
    return tick;
}

function loop(ticks, periodMs, day = 0) {
    let remainingTicks = ticks.filter((tick) => tick(day));
    if (remainingTicks.length > 0) {
        setTimeout(() => loop(remainingTicks, periodMs, day + 1), periodMs);
    }
}

function linearAlgorithm(currentPos) {
    const newPos = {
        x: currentPos.x + 3,
        y: currentPos.y + Math.random() * 10 - 5
    };
    return newPos;
}

// Box-muller transform from https://jsfiddle.net/ssell/qzzvruc4/
function gaussianRand() {
    this.generate = true;
    this.value0   = 0.0;
    this.value1   = 0.0;
    
    if (this.generate) {
        let x1 = 0.0, x2 = 0.0, w  = 0.0;
        do {
            // Math.random() gives value on range [0, 1) but
            // the Polar Form expects [-1, 1].
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

function gaussian(cycleLength, random = () => gaussianRand()* Math.PI) {
    return (pos) => {
        const randomAngle = random();
        return {
                x: pos.x + Math.cos(randomAngle) * cycleLength,
                y: pos.y + Math.sin(randomAngle) * cycleLength
            };
        };
}
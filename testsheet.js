'use strict';

const cnum = mathtoys.complex;
const sh = mathtoys.sheet;

let quiver, ui;                     // global/mutable for debugging

function onLoad() {
    // Try to fill the window, but leave some space for controls, and
    // hit a size that makes the grid lines occupy one pixel exactly.
    // XXX this is a poor place for the latter calculation -- should instead
    //  do a similar one in makeSheet, using all of the canvas but adjusting
    //  the grid size.
    let sideLimit = Math.min(window.innerWidth - 20,
                             window.innerHeight - 100);
    const gridLines = 8*5;
    const side = Math.floor(sideLimit / gridLines) * gridLines;

    quiver = sh.makeQuiver();

    const toy = makeSheetGroup({side, quiver, options: {}, controls: {}});
    document.getElementById('theSheets').appendChild(toy.element);
    ui = toy.ui;

    quiver.addWatcher(event => {
        if (event.tag === 'move') update();
    });

    window.toggleInstructions.onclick = () => {
        if (window.theInstructions.style.display === 'none') {
            window.toggleInstructions.innerHTML = "(Hide the instructions)";
            window.theInstructions.style.display = 'block';
        } else {
            window.toggleInstructions.innerHTML = "(Show the instructions)";
            window.theInstructions.style.display = 'none';
        }
    }
}

var mergeButton;                // XXX shouldn't be global

function makeSheetGroup({side, quiver, options, controls}) {
    const H = HTML;

    let fieldGroup, pinButton, renameButton, renameFrom, renameTo, showButton;

    const canvas = H.canvas({width: side, height: side});
    const ui = sh.makeSheetUI(quiver, canvas, options, controls);
    ui.show();

    const group = H.div({className: 'sheetgroup'}, [
        H.div({className: 'mainsheet'}, [
            canvas,
            H.br(),
            pinButton = makeButton("Pin/unpin point", onPin),
            " ",
            mergeButton = makeButton("Merge points", onMerge),
            " ",
            showButton = makeButton("Show field", onShowField),
            H.p(),
            "Rename ",
            renameFrom = H.input({type: 'text', size: 5}),
            " to ",
            renameTo = H.input({type: 'text', size: 5}),
            " ",
            renameButton = makeButton("Rename", onRename),
        ]),
        fieldGroup = H.div({className: 'fieldgroup'}),
    ]);

    pinButton.disabled    = true;
    mergeButton.disabled  = true;
    showButton.disabled   = true;
    renameButton.disabled = true;

    quiver.addWatcher(event => {
        switch (event.tag) {
        case 'add': {
            renameFrom.value = event.arrow.label;
            renameTo.value = "";
            renameButton.disabled = false;
            break;
        }
        }
    });
    ui.addWatcher(event => {
        switch (event.tag) {
        case 'selection': {
            const selected = (0 < event.is.length);
            pinButton.disabled = !selected;
            showButton.disabled = !selected;
            break;
        }
        }
    });

    return {
        element: group,
        canvas,
        ui,
    };

    function onPin() {
        ui.pinSelection();
        ui.show();
    }

    function onMerge() {
        ui.merge();
        ui.show();
    }

    function onShowField() {
        const input = quiver.getIndependentVariable();
        const selection = ui.getSelection();
        if (input !== null && 0 < selection.length) {
            addSheet(fieldGroup, input, selection[0]);
        }
    }

    function onRename() {
        const arrow = quiver.findLabel(renameFrom.value);
        const newLabel = renameTo.value.trim();
        if (arrow !== null && newLabel !== '') {
            arrow.label = newLabel;
            ui.show();
        }
    }
}

function makeButton(value, onClick) {
    const button = HTML.input({type: 'button', value});
    if (onClick) button.addEventListener('click', onClick);
    return button;
}


// Vector field stuff:

let zVar;                       // XXX shouldn't be global

// Pairs of [arrow, sheet].
const pairs = [];

function addSheet(group, domainArrow, rangeArrow) {
    zVar = domainArrow;

    const H = HTML;

    const size = {width: 380, height: 380}; // XXX
    const newCanvas = H.canvas(size);
    const newSheet = sh.makeSheet(newCanvas);
    pairs.push([rangeArrow, newSheet]); // XXX

    const deleteButton = makeButton('Delete', deleteSheet);

    const newDiv = H.div({className: 'fieldsheet'}, [
        newCanvas,
        H.br(),
        deleteButton,
        (" " + domainArrow.label + " \u2192 " // (right arrow char)
         + rangeArrow.label),
    ]);

    group.appendChild(newDiv);
    update();

    function deleteSheet() {
        deleteFromArray(pairs,          ([arrow, sheet]) => sheet === newSheet);
        deleteFromArray(pendingUpdates, ([arrow, sheet]) => sheet === newSheet);
        newDiv.remove();
    }
}

function deleteFromArray(array, isUnwanted) {
    for (let i = array.length - 1; 0 <= i; --i) {
        if (isUnwanted(array[i])) array.splice(i, 1);
    }
}

const pendingUpdates = [];

function update() {
    // Schedule pending updates round-robin style, to avoid starving
    // the updating of the later elements of pairs.
    pairs.filter(complement(isPending)).forEach(p => {
        pendingUpdates.push(p);
    });
    cancelAnimationFrame(doUpdates);
    requestAnimationFrame(doUpdates);
}

function isPending([arrow, _]) {
    return pendingUpdates.some(([pendingArrow, _]) => arrow === pendingArrow);
}

function complement(predicate) {
    return x => !predicate(x);
}

function doUpdates() {
    if (0 < pendingUpdates.length) {
        const startTime = Date.now();
        const pair = pendingUpdates[0];
        doUpdate(pair);
        pendingUpdates.splice(0, 1);
        requestAnimationFrame(doUpdates);
        if (0) console.log(Date.now() - startTime, pair[0].label);
    }
}

function doUpdate([arrow, sheet]) {
    const f = quiver.asFunction(zVar, arrow);
    sheet.clear();
    sheet.drawGrid();
    sheet.ctx.strokeStyle = 'black';
    sh.drawVectorField(sheet, zVar, f, 0.05, 15);
}

// Constraints solved by gradient descent.

;(function(exports) {

'use strict';

const cnum = mathtoys.complex;


// A constraint network is composed of wires and constraints.
// A constant wire has an empty name.

const names = [];
const wires = [];
const pins  = []; // if pins[i], then treat wires[i] as 'constant' for now

const constraints = [];

function makeRealRef(name, value=0) {
    const i = names.indexOf(name);
    return 0 <= i ? i : makeRealVariable(name, value);
}

function makeRealVariable(name, value=0) {
    const result = names.length;
    names.push(name);
    wires.push(value);
    pins.push(false);
    return result;
}

const constants = new Map();

function makeRealConstant(value) {
    if (0) {
        // To dedupe the constants, but I don't actually want that
        // right now, because I might want to change the 'constants'.
        // TODO make a cleaner design.
        const i = constants.get(value);
        if (i !== void 0) return i;
    }
    const result = names.length;
    names.push('');
    wires.push(value);
    pins.push(true);
    constants.set(value, result);
    return result;    
}

function addConstraint(op, a, b, v) {
    constraints.push([op, a, b, v]);
}

function realAdd(a, b, v) {
    addConstraint('+', a, b, v);
}

function realMul(a, b, v) {
    addConstraint('*', a, b, v);
}


// Gradient descent, supposing I'm not screwing it up.

let stepSize = 0.01;

function descend(nsteps) {
    for (let trial = 0; trial < nsteps; ++trial) {
        gradient().forEach((difference, i) => {
            if (!pins[i]) wires[i] -= stepSize * difference;
        });
        if (0) console.log('step', trial, 'error', totalError());
    }
}

function gradient() {
    const pd = wires.map(_ => 0);
    for (const [op, a, b, v] of constraints) {
        const av = wires[a];
        const bv = wires[b];
        const vv = wires[v];
        switch (op) {
        case '+': {
            // E = 0.5 * (a+b - v)**2
            // E' = (a+b - v) * (a+b - v)'
            const diff = av + bv - vv;
            pd[a] += diff;
            pd[b] += diff;
            pd[v] -= diff;
        }
            break;
        case '*': {
            // E = 0.5 * (a*b - v)**2
            // E' = (a*b - v) * (a*b - v)'
            //    = (a*b - v) * (a'*b + a*b' - v')
            const diff = av * bv - vv;
            pd[a] += diff * bv;
            pd[b] += diff * av;
            pd[v] -= diff;
        }
            break;
        default:
            throw new Error('XXX');
        }
    }
    return pd;
}

function totalError() {
    return sum(constraints.map(error));
}

function sum(numbers) {
    return numbers.reduce((total, n) => total + n, 0);
}

function error([op, a, b, v]) {
    const av = wires[a];
    const bv = wires[b];
    const vv = wires[v];
    let r;
    switch (op) {
    case '+': r = av + bv; break;
    case '*': r = av * bv; break;
    default: throw new Error('XXX');
    }
    return 0.5 * (r - vv) * (r - vv);
}


// Equate and eliminate variables

function substitute(substs) {
    for (const c of constraints) {
        let x;
        x = substs.get(c[1]); if (x !== void 0) c[1] = x;
        x = substs.get(c[2]); if (x !== void 0) c[2] = x;
        x = substs.get(c[3]); if (x !== void 0) c[3] = x;
    }
}


// Where the reals have a wire, the complex numbers have a pair of wires.

function makeComplexRef(name, value=cnum.zero) {
    return [makeRealRef(name+'.x', value.re),
            makeRealRef(name+'.y', value.im)];
}

function makeComplexConstant(value) {
    return [makeRealConstant(value.re),
            makeRealConstant(value.im)];
}

function complexAdd(a, b, v) {
    realAdd(a[0], b[0], v[0]);
    realAdd(a[1], b[1], v[1]);
}

let gensym_count = 0;

function genvar(stem, value=0) {
    return makeRealRef(stem + ('_' + gensym_count++), value);
}

function complexMul([a_re, a_im], [b_re, b_im], [v_re, v_im]) {
    const [x1, x2] = [genvar('x1', wires[a_re]*wires[b_re]),
                      genvar('x2', wires[a_im]*wires[b_im])];
    const [y1, y2] = [genvar('y1', wires[a_im]*wires[b_re]),
                      genvar('y2', wires[a_re]*wires[b_im])];
    realMul(a_re, b_re, x1);
    realMul(a_im, b_im, x2);
    realAdd(v_re, x2, x1);
    realMul(a_im, b_re, y1);
    realMul(a_re, b_im, y2);
    realAdd(y1, y2, v_im);
}


exports.mathtoys.descent = {
    names,
    wires,
    pins,
    constraints,

    makeRealConstant,
    makeRealRef,
    realAdd,
    realMul,

    genvar,

    complexAdd,
    complexMul,
    makeComplexConstant,
    makeComplexRef,

    substitute,

    descend,
    totalError,
};
})(this);

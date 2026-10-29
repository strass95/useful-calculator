const displayElement = document.querySelector("#display");
const displayLabelElement = document.querySelector("#display-label");
const operationElement = document.querySelector("#operation");
const footerStatusElement = document.querySelector("#footer-status");
const ambientNumbersElement = document.querySelector("#ambient-numbers");
const buttonContainer = document.querySelector(".calculator");

const MAX_FLOATING_NUMBERS = 20;
const FLOATING_NUMBER_DURATION = 20_000;
const MAX_INPUT_LENGTH = 16;
const OPERATOR_SYMBOLS = {
	add: "+",
	subtract: "−",
	multiply: "×",
	divide: "÷",
};

const calculatorState = {
	currentInput: "0",
	storedValue: null,
	operator: null,
	waitingForOperand: false,
	convertedOutput: null,
};

const activeFloatingNumbers = new Set();

function formatNumber(value) {
	if (!Number.isFinite(value)) {
		return "Erro";
	}

	const roundedValue = Number(value.toPrecision(12));
	return String(Object.is(roundedValue, -0) ? 0 : roundedValue);
}

function formatForDisplay(value) {
	return value.replace(".", ",");
}

function renderDisplay(label = "ENTRADA") {
	const visibleValue = calculatorState.convertedOutput ?? calculatorState.currentInput;
	displayElement.textContent = formatForDisplay(visibleValue);
	displayLabelElement.textContent = label;
}

function setStatus(message) {
	footerStatusElement.textContent = message;
}

function resetConversion() {
	calculatorState.convertedOutput = null;
	operationElement.textContent = "";
	renderDisplay();
}

function parseCurrentInput() {
	return Number(calculatorState.currentInput);
}

function showFloatingNumber(value) {
	if (activeFloatingNumbers.size >= MAX_FLOATING_NUMBERS) {
		return;
	}

	const floatingNumber = document.createElement("span");
	floatingNumber.className = "floating-number";
	floatingNumber.textContent = value;
	floatingNumber.style.left = `${Math.random() * 92}%`;
	floatingNumber.style.top = `${75 + Math.random() * 30}vh`;
	floatingNumber.style.fontSize = `${16 + Math.floor(Math.random() * 21)}px`;
	ambientNumbersElement.append(floatingNumber);
	activeFloatingNumbers.add(floatingNumber);

	const removeFloatingNumber = () => {
		if (!activeFloatingNumbers.has(floatingNumber)) {
			return;
		}

		activeFloatingNumbers.delete(floatingNumber);
		floatingNumber.remove();
	};

	floatingNumber.addEventListener("animationend", removeFloatingNumber, { once: true });
	window.setTimeout(removeFloatingNumber, FLOATING_NUMBER_DURATION + 100);
}

function showResult(value, label, expression) {
	calculatorState.currentInput = formatNumber(value);
	calculatorState.convertedOutput = null;
	calculatorState.waitingForOperand = true;
	operationElement.textContent = expression;
	renderDisplay(label);
	showFloatingNumber(formatForDisplay(calculatorState.currentInput));
	setStatus("RESULTADO");
}

function enterDigit(digit) {
	if (calculatorState.waitingForOperand || calculatorState.convertedOutput !== null) {
		calculatorState.currentInput = digit;
		calculatorState.waitingForOperand = false;
	} else if (calculatorState.currentInput.replace("-", "").length < MAX_INPUT_LENGTH) {
		calculatorState.currentInput = calculatorState.currentInput === "0"
			? digit
			: `${calculatorState.currentInput}${digit}`;
	}

	resetConversion();
	setStatus("ENTRADA");
}

function enterDecimalSeparator() {
	if (calculatorState.waitingForOperand || calculatorState.convertedOutput !== null) {
		calculatorState.currentInput = "0.";
		calculatorState.waitingForOperand = false;
	} else if (!calculatorState.currentInput.includes(".")) {
		calculatorState.currentInput += ".";
	}

	resetConversion();
	setStatus("ENTRADA");
}

function chooseOperator(operator) {
	const currentValue = parseCurrentInput();

	if (calculatorState.operator && !calculatorState.waitingForOperand) {
		const result = calculate(calculatorState.storedValue, currentValue, calculatorState.operator);
		if (result === null) {
			showError();
			return;
		}
		calculatorState.currentInput = formatNumber(result);
	}

	calculatorState.storedValue = parseCurrentInput();
	calculatorState.operator = operator;
	calculatorState.waitingForOperand = true;
	calculatorState.convertedOutput = null;
	operationElement.textContent = `${formatForDisplay(calculatorState.currentInput)} ${OPERATOR_SYMBOLS[operator]}`;
	renderDisplay("OPERAÇÃO");
	setStatus("OPERADOR");
}

function calculate(left, right, operator) {
	switch (operator) {
		case "add":
			return left + right;
		case "subtract":
			return left - right;
		case "multiply":
			return left * right;
		case "divide":
			return right === 0 ? null : left / right;
		default:
			return null;
	}
}

function evaluateExpression() {
	if (!calculatorState.operator || calculatorState.storedValue === null) {
		return;
	}

	const leftValue = calculatorState.storedValue;
	const rightValue = parseCurrentInput();
	const operator = calculatorState.operator;
	const result = calculate(leftValue, rightValue, operator);

	if (result === null || !Number.isFinite(result)) {
		showError();
		return;
	}

	showResult(
		result,
		"RESULTADO",
		`${formatForDisplay(formatNumber(leftValue))} ${OPERATOR_SYMBOLS[operator]} ${formatForDisplay(formatNumber(rightValue))} =`,
	);
	calculatorState.storedValue = null;
	calculatorState.operator = null;
}

function showError() {
	calculatorState.currentInput = "0";
	calculatorState.storedValue = null;
	calculatorState.operator = null;
	calculatorState.waitingForOperand = true;
	calculatorState.convertedOutput = null;
	operationElement.textContent = "DIVISÃO POR ZERO NÃO PERMITIDA";
	displayElement.textContent = "Erro";
	displayLabelElement.textContent = "FALHA";
	setStatus("ERRO");
}

function toggleSign() {
	if (parseCurrentInput() === 0) {
		return;
	}

	calculatorState.currentInput = calculatorState.currentInput.startsWith("-")
		? calculatorState.currentInput.slice(1)
		: `-${calculatorState.currentInput}`;
	calculatorState.waitingForOperand = false;
	resetConversion();
}

function applyPercent() {
	const result = parseCurrentInput() / 100;
	if (!Number.isFinite(result)) {
		showError();
		return;
	}

	operationElement.textContent = `${formatForDisplay(calculatorState.currentInput)}% =`;
	showResult(result, "PORCENTAGEM", operationElement.textContent);
}

function convertFractionToBase(value, base) {
	const absoluteValue = Math.abs(value);
	const integerPart = Math.trunc(absoluteValue);
	let fractionPart = absoluteValue - integerPart;
	let converted = integerPart.toString(base).toUpperCase();

	if (fractionPart > 0) {
		let fractionDigits = "";
		for (let index = 0; index < 8 && fractionPart > 0; index += 1) {
			fractionPart *= base;
			const digit = Math.floor(fractionPart);
			fractionDigits += digit.toString(base).toUpperCase();
			fractionPart -= digit;
		}
		converted += `.${fractionDigits}`;
	}

	return value < 0 ? `-${converted}` : converted;
}

function convertCurrentValue(base) {
	const decimalValue = parseCurrentInput();
	if (!Number.isFinite(decimalValue)) {
		showError();
		return;
	}

	const convertedValue = convertFractionToBase(decimalValue, base);
	calculatorState.convertedOutput = convertedValue;
	operationElement.textContent = `${formatForDisplay(calculatorState.currentInput)} (10) → (${base})`;
	renderDisplay(base === 2 ? "BINÁRIO · BASE 2" : "HEXADECIMAL · BASE 16");
	showFloatingNumber(formatForDisplay(convertedValue));
	setStatus("CONVERSÃO");
}

function clearCalculator() {
	calculatorState.currentInput = "0";
	calculatorState.storedValue = null;
	calculatorState.operator = null;
	calculatorState.waitingForOperand = false;
	calculatorState.convertedOutput = null;
	operationElement.textContent = "";
	renderDisplay();
	setStatus("PRONTA");
}

function handleAction(action) {
	switch (action) {
		case "clear":
			clearCalculator();
			break;
		case "toggle-sign":
			toggleSign();
			break;
		case "percent":
			applyPercent();
			break;
		case "decimal":
			enterDecimalSeparator();
			break;
		case "calculate":
			evaluateExpression();
			break;
		case "convert-binary":
			convertCurrentValue(2);
			break;
		case "convert-hex":
			convertCurrentValue(16);
			break;
		default:
			if (Object.hasOwn(OPERATOR_SYMBOLS, action)) {
				chooseOperator(action);
			}
	}
}

buttonContainer.addEventListener("click", (event) => {
	const button = event.target.closest("button");
	if (!button) {
		return;
	}

	if (button.dataset.number !== undefined) {
		enterDigit(button.dataset.number);
		return;
	}

	handleAction(button.dataset.action);
});

document.addEventListener("keydown", (event) => {
	if (/^\d$/.test(event.key)) {
		enterDigit(event.key);
	} else if (event.key === "." || event.key === ",") {
		enterDecimalSeparator();
	} else if (["+", "-", "*", "/"].includes(event.key)) {
		const operatorByKey = { "+": "add", "-": "subtract", "*": "multiply", "/": "divide" };
		chooseOperator(operatorByKey[event.key]);
	} else if (event.key === "Enter" || event.key === "=") {
		event.preventDefault();
		evaluateExpression();
	} else if (event.key === "Escape") {
		clearCalculator();
	} else if (event.key === "%") {
		applyPercent();
	}
});

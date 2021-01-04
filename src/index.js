import * as pdfjs from "pdfjs-dist";
import { twelvePointScaleLetterToPoint } from "./grades-map.js";

// To avoid error: `Setting up fake worker failed: "Cannot read property 'WorkerMessageHandler' of undefined"`.
pdfjs.GlobalWorkerOptions.workerSrc = require("pdfjs-dist/build/pdf.worker.entry.js");

const gradesRegex = /[0-9]+.[0-9]+.\/[0-9]+.[0-9]+(?:Grade)?(COM|[A-F][+-]?)/g;
const weightAchievedRegex = /[0-9]+.[0-9]+[^/]+/;
const weightPossibleRegex = /(?<=\/)[0-9]+.[0-9]+/; // Positive lookbehind may not be supported in all browsers!
const letterGradeRegex = /[A-F][+-]?/;

export class Calculator {
	constructor() {
		this.parsedResult = [];
		this.cummulativeGpa = null;
	}

	extractGradesFromFile = () => {
		this.clearResults();
		const selectedFile = document.getElementById("upload").files[0];
		const fileReader = new FileReader();
		fileReader.onload = async (event) => {
			const typeDArray = new Uint8Array(event.target.result);
			const pdf = await pdfjs.getDocument(typeDArray).promise;
			const maxPages = pdf._pdfInfo.numPages;
			const pagePromises = [];
			for (let i = 1; i <= maxPages; i++) { // Pages start at 1 for some reason..
				const page = await pdf.getPage(i);
				pagePromises.push((async () => {
					const textContent = await page.getTextContent();
					return textContent.items.map((s) => s.str).join("");
				})());
			};
			const text = await Promise.all(pagePromises);
			let execResult = [];
			while ((execResult = gradesRegex.exec(text)) !== null) {
				if (!execResult[0].includes("COM")) {
					this.parsedResult.push(execResult[0].replace(/Grade/g, ""));
				}
			}
		};
		fileReader.readAsArrayBuffer(selectedFile);
	}

	getGpa = async () => {
		if (!this.parsedResult.length) {
			return;
		}
		let totalWeightAchieved = 0;
		let totalWeightPossible = 0;
		this.parsedResult.forEach(grade => {
			const weightAchieved = weightAchievedRegex.exec(grade)[0];
			const weightPossible = weightPossibleRegex.exec(grade)[0];
			const letterGrade = letterGradeRegex.exec(grade)[0];

			totalWeightPossible += weightPossible * 12;
			totalWeightAchieved += weightAchieved * twelvePointScaleLetterToPoint[letterGrade];
		});

		this.cummulativeGpa = totalWeightAchieved / totalWeightPossible * 100;
		document.getElementById("cummulative-gpa").textContent = this.cummulativeGpa.toFixed(2);
	}

	clearResults = () => {
		this.parsedResult = [];
		this.cummulativeGpa = null;
	}
}

const GpaCalculator = new Calculator();

window.GpaCalculator = GpaCalculator;

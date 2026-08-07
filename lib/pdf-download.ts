import domtoimage from "dom-to-image-more";
import { jsPDF } from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const A4_WIDTH_PX = 793; // 210mm at 96dpi

/**
 * Captures an HTML element and downloads it as a PDF file.
 * Forces the element to A4 width and resets text wrapping before capturing
 * to ensure consistent output regardless of viewport size.
 */
export async function downloadElementAsPdf(
	element: HTMLElement,
	filename: string,
): Promise<void> {
	// Save original styles
	const originalStyles = {
		width: element.style.width,
		minWidth: element.style.minWidth,
		maxWidth: element.style.maxWidth,
		position: element.style.position,
		top: element.style.top,
		left: element.style.left,
		zIndex: element.style.zIndex,
		transform: element.style.transform,
	};

	// Add override style to reset text wrapping for capture
	const styleEl = document.createElement("style");
	styleEl.setAttribute("data-pdf-capture", "true");
	styleEl.textContent = `
		[data-pdf-capture="true"] ~ * [data-pdf-capture-ignore] {
			white-space: normal !important;
		}
		.pdf-capture-reset {
			word-wrap: normal !important;
			overflow-wrap: normal !important;
			white-space: normal !important;
			flex-wrap: nowrap !important;
		}
		.pdf-capture-reset * {
			word-wrap: normal !important;
			overflow-wrap: normal !important;
		}
		.pdf-capture-reset h1,
		.pdf-capture-reset h2,
		.pdf-capture-reset h3,
		.pdf-capture-reset .text-sm,
		.pdf-capture-reset .text-xs,
		.pdf-capture-reset .text-base,
		.pdf-capture-reset span,
		.pdf-capture-reset p {
			white-space: nowrap !important;
		}
		.pdf-capture-reset table {
			table-layout: fixed !important;
			width: 100% !important;
		}
		.pdf-capture-reset .flex {
			flex-wrap: nowrap !important;
		}
	`;
	document.head.appendChild(styleEl);

	// Force element to A4 width for consistent capture
	element.style.width = `${A4_WIDTH_PX}px`;
	element.style.minWidth = `${A4_WIDTH_PX}px`;
	element.style.maxWidth = `${A4_WIDTH_PX}px`;
	element.style.position = "fixed";
	element.style.top = "0";
	element.style.left = "0";
	element.style.zIndex = "-1";
	element.style.transform = "none";

	// Add reset class to prevent text wrapping
	element.classList.add("pdf-capture-reset");

	// Wait for layout reflow
	await new Promise((r) => setTimeout(r, 200));

	let imgData: string;
	try {
		imgData = await domtoimage.toPng(element, {
			quality: 1,
			pixelRatio: 2,
			bgcolor: "#ffffff",
			width: A4_WIDTH_PX,
			style: {
				"print-color-adjust": "exact",
				"-webkit-print-color-adjust": "exact",
			},
		});
	} finally {
		// Restore original styles
		Object.assign(element.style, originalStyles);
		element.classList.remove("pdf-capture-reset");
		styleEl.remove();
	}

	const img = new Image();
	await new Promise<void>((resolve, reject) => {
		img.onload = () => resolve();
		img.onerror = reject;
		img.src = imgData;
	});

	const pdf = new jsPDF({
		orientation: "portrait",
		unit: "mm",
		format: "a4",
	});

	const imgWidth = A4_WIDTH_MM;
	const imgHeight = (img.height * A4_WIDTH_MM) / img.width;

	let heightLeft = imgHeight;
	let position = 0;

	pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
	heightLeft -= A4_HEIGHT_MM;

	while (heightLeft > 0) {
		position = heightLeft - imgHeight;
		pdf.addPage();
		pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
		heightLeft -= A4_HEIGHT_MM;
	}

	pdf.save(filename);
}

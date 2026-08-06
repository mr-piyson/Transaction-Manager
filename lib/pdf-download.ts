import domtoimage from "dom-to-image-more";
import { jsPDF } from "jspdf";

/**
 * Captures an HTML element and downloads it as a PDF file.
 * Uses dom-to-image-more for better cross-browser/mobile compatibility.
 */
export async function downloadElementAsPdf(
	element: HTMLElement,
	filename: string,
): Promise<void> {
	const imgData = await domtoimage.toPng(element, {
		quality: 1,
		pixelRatio: 2,
		bgcolor: "#ffffff",
		style: {
			"print-color-adjust": "exact",
			"-webkit-print-color-adjust": "exact",
		},
	});

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

	const pdfWidth = 210;
	const pdfHeight = 297;
	const imgWidth = pdfWidth;
	const imgHeight = (img.height * pdfWidth) / img.width;

	let heightLeft = imgHeight;
	let position = 0;

	pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
	heightLeft -= pdfHeight;

	while (heightLeft > 0) {
		position = heightLeft - imgHeight;
		pdf.addPage();
		pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
		heightLeft -= pdfHeight;
	}

	pdf.save(filename);
}
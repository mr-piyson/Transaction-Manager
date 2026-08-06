import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

/**
 * Captures an HTML element and downloads it as a PDF file.
 */
export async function downloadElementAsPdf(
	element: HTMLElement,
	filename: string,
): Promise<void> {
	const canvas = await html2canvas(element, {
		scale: 2,
		useCORS: true,
		backgroundColor: "#ffffff",
	});

	const imgWidth = 210; // A4 width in mm
	const imgHeight = (canvas.height * imgWidth) / canvas.width;

	const pdf = new jsPDF({
		orientation: imgHeight > 297 ? "portrait" : "portrait",
		unit: "mm",
		format: "a4",
	});

	const imgData = canvas.toDataURL("image/png");
	let heightLeft = imgHeight;
	let position = 0;

	pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
	heightLeft -= 297;

	while (heightLeft > 0) {
		position = -(297 * (Math.ceil(imgHeight / 297) - Math.ceil(heightLeft / 297)));
		pdf.addPage();
		pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
		heightLeft -= 297;
	}

	pdf.save(filename);
}
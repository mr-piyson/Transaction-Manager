import type { ParsedItem } from './types';

function getSampleImage(sku: string, hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" fill="hsl(${hue}, 60%, 85%)" rx="8"/>
    <text x="60" y="60" text-anchor="middle" dominant-baseline="central"
          font-family="monospace" font-size="11" fill="hsl(${hue}, 40%, 30%)">
      ${sku}
    </text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function generateSampleData(): ParsedItem[] {
  const items: ParsedItem[] = [
    { sku: 'RAW-AL-001', name: 'Aluminum Sheet 2mm', description: '2mm thick aluminum sheet, 4x8 ft', salesPrice: 45.00, purchasePrice: 28.50, unit: 'sheet', minStock: 20, reorderPoint: 50, reorderQty: 100, barcode: '4901234567890', categoryName: 'Raw Materials', rowNumber: 1, hasImage: true },
    { sku: 'RAW-ST-002', name: 'Steel Rod 12mm', description: '12mm diameter steel rod, 6m length', salesPrice: 18.75, purchasePrice: 11.20, unit: 'rod', minStock: 50, reorderPoint: 150, reorderQty: 300, categoryName: 'Raw Materials', rowNumber: 2, hasImage: true },
    { sku: 'FIN-BO-001', name: 'Wooden Pallet 1200x800', description: 'Euro pallet, heat treated, ISPM 15 compliant', salesPrice: 12.00, purchasePrice: 7.50, unit: 'pcs', minStock: 100, reorderPoint: 200, reorderQty: 500, barcode: '5901234567890', categoryName: 'Finished Goods', rowNumber: 3, hasImage: true },
    { sku: 'FIN-BX-002', name: 'Corrugated Box 40x30x20', description: 'Double wall corrugated box for shipping', salesPrice: 2.50, purchasePrice: 1.20, unit: 'pcs', minStock: 500, reorderPoint: 1000, reorderQty: 2000, barcode: '6901234567890', categoryName: 'Finished Goods', rowNumber: 4, hasImage: true },
    { sku: 'MRO-GL-001', name: 'Safety Glasses', description: 'ANSI Z87.1 certified clear safety glasses', salesPrice: 5.99, purchasePrice: 3.20, unit: 'pcs', minStock: 30, reorderPoint: 80, reorderQty: 200, categoryName: 'MRO Supplies', rowNumber: 5, hasImage: true },
    { sku: 'MRO-GV-002', name: 'Work Gloves Leather', description: 'Full grain leather work gloves, size L', salesPrice: 8.50, purchasePrice: 4.80, unit: 'pair', minStock: 40, reorderPoint: 100, reorderQty: 250, barcode: '7891234567890', categoryName: 'MRO Supplies', rowNumber: 6, hasImage: true },
    { sku: 'SVC-INS-001', name: 'Equipment Inspection', description: 'Annual safety inspection for industrial equipment', salesPrice: 250.00, purchasePrice: 0, unit: 'visit', categoryName: 'Services', rowNumber: 7, hasImage: true },
    { sku: 'SVC-CON-002', name: 'Consulting Hourly', description: 'On-site technical consulting per hour', salesPrice: 95.00, purchasePrice: 0, unit: 'hr', categoryName: 'Services', rowNumber: 8, hasImage: true },
    { sku: 'WIP-CMP-001', name: 'Control Panel Assembly', description: 'Custom industrial control panel, partial assembly', salesPrice: 1200.00, purchasePrice: 780.00, unit: 'pcs', minStock: 2, reorderPoint: 5, reorderQty: 10, barcode: '8901234567890', categoryName: 'WIP', rowNumber: 9, hasImage: true },
    { sku: 'WIP-HRN-002', name: 'Wire Harness Sub-assembly', description: 'Pre-assembled wiring harness for Panel Type B', salesPrice: 45.00, purchasePrice: 28.00, unit: 'pcs', minStock: 15, reorderPoint: 40, reorderQty: 100, categoryName: 'WIP', rowNumber: 10, hasImage: true },
    { sku: 'FIN-PL-003', name: 'Plastic Storage Bin Blue', description: 'Heavy-duty plastic bin 600x400x300mm', salesPrice: 15.00, purchasePrice: 8.90, unit: 'pcs', minStock: 60, reorderPoint: 150, reorderQty: 300, barcode: '9901234567890', categoryName: 'Finished Goods', rowNumber: 11, hasImage: true },
    { sku: 'MRO-TP-003', name: 'Duct Tape 50m Silver', description: 'Professional grade duct tape, 50 meters', salesPrice: 3.99, purchasePrice: 1.95, unit: 'roll', minStock: 80, reorderPoint: 200, reorderQty: 500, categoryName: 'MRO Supplies', rowNumber: 12, hasImage: true },
  ];

  return items.map((item, i) => ({
    ...item,
    image: getSampleImage(item.sku, i * 30),
  }));
}

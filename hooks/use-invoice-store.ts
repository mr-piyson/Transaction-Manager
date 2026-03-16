import { useState, useCallback } from 'react';
import { Invoice, InvoiceRow, InvoiceLine, InvoiceGroup, InventoryItem } from '@/types/invoice';
import { createInvoiceLine, createInvoiceGroup, mockInvoice } from '@/lib/mock-data';

export function useInvoiceStore() {
  const [invoice, setInvoice] = useState<Invoice>({ ...mockInvoice });

  const calculateTotals = useCallback((items: InvoiceRow[]): { subtotal: number; taxTotal: number; discountTotal: number; total: number } => {
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    items.forEach((item) => {
      if (item.type === 'line') {
        const lineSubtotal = item.quantity * item.unitPrice;
        const lineDiscount = (lineSubtotal * item.discount) / 100;
        const lineTax = ((lineSubtotal - lineDiscount) * item.tax) / 100;
        subtotal += lineSubtotal;
        discountTotal += lineDiscount;
        taxTotal += lineTax;
      } else if (item.type === 'group') {
        item.lines.forEach((line) => {
          const lineSubtotal = line.quantity * line.unitPrice;
          const lineDiscount = (lineSubtotal * line.discount) / 100;
          const lineTax = ((lineSubtotal - lineDiscount) * line.tax) / 100;
          subtotal += lineSubtotal;
          discountTotal += lineDiscount;
          taxTotal += lineTax;
        });
      }
    });

    return {
      subtotal,
      taxTotal,
      discountTotal,
      total: subtotal - discountTotal + taxTotal,
    };
  }, []);

  const updateInvoice = useCallback(
    (updates: Partial<Invoice>) => {
      setInvoice((prev) => {
        const newItems = updates.items ?? prev.items;
        const totals = calculateTotals(newItems);
        return { ...prev, ...updates, ...totals };
      });
    },
    [calculateTotals],
  );

  const addLine = useCallback(
    (inventoryItem: InventoryItem, groupId?: string) => {
      setInvoice((prev) => {
        const newLine = createInvoiceLine(inventoryItem);
        let newItems: InvoiceRow[];

        if (groupId) {
          newItems = prev.items.map((item) => {
            if (item.type === 'group' && item.id === groupId) {
              const updatedLines = [...item.lines, { ...newLine, groupId }];
              const groupSubtotal = updatedLines.reduce((sum, l) => sum + l.total, 0);
              return { ...item, lines: updatedLines, subtotal: groupSubtotal };
            }
            return item;
          });
        } else {
          newItems = [...prev.items, newLine];
        }

        const totals = calculateTotals(newItems);
        return { ...prev, items: newItems, ...totals };
      });
    },
    [calculateTotals],
  );

  const addGroup = useCallback((name: string) => {
    setInvoice((prev) => {
      const newGroup = createInvoiceGroup(name);
      const newItems = [...prev.items, newGroup];
      return { ...prev, items: newItems };
    });
  }, []);

  const updateLine = useCallback(
    (lineId: string, updates: Partial<InvoiceLine>, groupId?: string) => {
      setInvoice((prev) => {
        let newItems: InvoiceRow[];

        if (groupId) {
          newItems = prev.items.map((item) => {
            if (item.type === 'group' && item.id === groupId) {
              const updatedLines = item.lines.map((line) => {
                if (line.id === lineId) {
                  const updatedLine = { ...line, ...updates };
                  const subtotal = updatedLine.quantity * updatedLine.unitPrice;
                  const discount = (subtotal * updatedLine.discount) / 100;
                  const tax = ((subtotal - discount) * updatedLine.tax) / 100;
                  updatedLine.total = subtotal - discount + tax;
                  return updatedLine;
                }
                return line;
              });
              const groupSubtotal = updatedLines.reduce((sum, l) => sum + l.total, 0);
              return { ...item, lines: updatedLines, subtotal: groupSubtotal };
            }
            return item;
          });
        } else {
          newItems = prev.items.map((item) => {
            if (item.type === 'line' && item.id === lineId) {
              const updatedLine = { ...item, ...updates };
              const subtotal = updatedLine.quantity * updatedLine.unitPrice;
              const discount = (subtotal * updatedLine.discount) / 100;
              const tax = ((subtotal - discount) * updatedLine.tax) / 100;
              updatedLine.total = subtotal - discount + tax;
              return updatedLine;
            }
            return item;
          });
        }

        const totals = calculateTotals(newItems);
        return { ...prev, items: newItems, ...totals };
      });
    },
    [calculateTotals],
  );

  const updateGroup = useCallback((groupId: string, updates: Partial<InvoiceGroup>) => {
    setInvoice((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.type === 'group' && item.id === groupId) {
          return { ...item, ...updates };
        }
        return item;
      });
      return { ...prev, items: newItems };
    });
  }, []);

  const removeLine = useCallback(
    (lineId: string, groupId?: string) => {
      setInvoice((prev) => {
        let newItems: InvoiceRow[];

        if (groupId) {
          newItems = prev.items.map((item) => {
            if (item.type === 'group' && item.id === groupId) {
              const updatedLines = item.lines.filter((line) => line.id !== lineId);
              const groupSubtotal = updatedLines.reduce((sum, l) => sum + l.total, 0);
              return { ...item, lines: updatedLines, subtotal: groupSubtotal };
            }
            return item;
          });
        } else {
          newItems = prev.items.filter((item) => !(item.type === 'line' && item.id === lineId));
        }

        const totals = calculateTotals(newItems);
        return { ...prev, items: newItems, ...totals };
      });
    },
    [calculateTotals],
  );

  const removeGroup = useCallback(
    (groupId: string) => {
      setInvoice((prev) => {
        const newItems = prev.items.filter((item) => !(item.type === 'group' && item.id === groupId));
        const totals = calculateTotals(newItems);
        return { ...prev, items: newItems, ...totals };
      });
    },
    [calculateTotals],
  );

  const toggleGroupExpanded = useCallback((groupId: string) => {
    setInvoice((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.type === 'group' && item.id === groupId) {
          return { ...item, expanded: !item.expanded };
        }
        return item;
      });
      return { ...prev, items: newItems };
    });
  }, []);

  const moveLineToGroup = useCallback(
    (lineId: string, fromGroupId: string | undefined, toGroupId: string | undefined) => {
      setInvoice((prev) => {
        let lineToMove: InvoiceLine | null = null;
        let newItems = [...prev.items];

        // Find and remove the line from its current location
        if (fromGroupId) {
          newItems = newItems.map((item) => {
            if (item.type === 'group' && item.id === fromGroupId) {
              const line = item.lines.find((l) => l.id === lineId);
              if (line) {
                lineToMove = { ...line, groupId: toGroupId };
              }
              const updatedLines = item.lines.filter((l) => l.id !== lineId);
              const groupSubtotal = updatedLines.reduce((sum, l) => sum + l.total, 0);
              return { ...item, lines: updatedLines, subtotal: groupSubtotal };
            }
            return item;
          });
        } else {
          const lineIndex = newItems.findIndex((item) => item.type === 'line' && item.id === lineId);
          if (lineIndex !== -1) {
            lineToMove = { ...(newItems[lineIndex] as InvoiceLine), groupId: toGroupId };
            newItems.splice(lineIndex, 1);
          }
        }

        // Add the line to its new location
        if (lineToMove) {
          if (toGroupId) {
            newItems = newItems.map((item) => {
              if (item.type === 'group' && item.id === toGroupId) {
                const updatedLines = [...item.lines, lineToMove!];
                const groupSubtotal = updatedLines.reduce((sum, l) => sum + l.total, 0);
                return { ...item, lines: updatedLines, subtotal: groupSubtotal };
              }
              return item;
            });
          } else {
            newItems.push({ ...lineToMove, groupId: undefined });
          }
        }

        const totals = calculateTotals(newItems);
        return { ...prev, items: newItems, ...totals };
      });
    },
    [calculateTotals],
  );

  return {
    invoice,
    updateInvoice,
    addLine,
    addGroup,
    updateLine,
    updateGroup,
    removeLine,
    removeGroup,
    toggleGroupExpanded,
    moveLineToGroup,
  };
}

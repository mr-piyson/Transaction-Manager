import { Table, Transaction } from "@prisma/client"
import { useMemo } from "react"
import AmountInput from "../AmountInput"

export default function TableFooter({
  rowData,
  updatedTransaction,
  table,
  isComplete,
}: {
  isComplete: boolean
  rowData: Transaction[]
  updatedTransaction: Transaction | null
  table: Table
}) {
  const total = useMemo(() => {
    return rowData.reduce((acc, { id, amount, qty, type }) => {
      let transactionAmount = amount * qty

      if (updatedTransaction && id === updatedTransaction.id) {
        transactionAmount = updatedTransaction.amount * updatedTransaction.qty
        type = updatedTransaction.type
      }

      if (type === "expense") {
        return acc - transactionAmount
      }
      return acc + transactionAmount
    }, 0)
  }, [rowData, updatedTransaction])

  return (
    <tfoot className="w-full  border-solid  rounded-b-[7px] p-1 bg-[#114565] z-10">
      <tr className="grid grid-cols-4 ">
        <td className=""></td>
        <td className=""></td>
        <td className="y-center-end">Total Expenses: </td>
        <td className="px-[15px]">
          <span className="text-red-500">
            {total > 0 ? "+" : "-"} {Math.abs(total / 1000).toFixed(3)} BD
          </span>
        </td>
      </tr>
      <tr className="grid grid-cols-4 ">
        <td></td>
        <td></td>
        <td className="y-center-end">Paid : </td>
        <td className="px-[15px]">
          <span>
            <AmountInput
              table={table}
              className="bg-background [&::-webkit-inner-spin-button]:appearance-none"
              disabled={isComplete}
            />
          </span>
        </td>
      </tr>
    </tfoot>
  )
}

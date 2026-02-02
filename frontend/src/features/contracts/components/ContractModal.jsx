import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Save, Loader2 } from "lucide-react"
import { ContractFormFields } from './ContractFormFields';

/**
 * Contract modal component for creating/editing contracts
 */
export function ContractModal({
  open,
  editingContractId,
  form,
  updateField,
  errors,
  status,
  saving,
  attendanceBonusAmount,
  perfectAttendanceAmount,
  totalSalary,
  onSubmit,
  onCancel
}) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="bg-[#1a3e62] text-white p-6 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-xl font-bold tracking-tight">
            {editingContractId ? "EDIT CONTRACT" : "NEW CONTRACT"}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="text-white hover:bg-white/10 hover:text-white h-8 w-8"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh]">
          <div className="p-8">
            <form id="contract-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
              <ContractFormFields
                form={form}
                updateField={updateField}
                errors={errors}
                attendanceBonusAmount={attendanceBonusAmount}
                perfectAttendanceAmount={perfectAttendanceAmount}
                totalSalary={totalSalary}
              />
            </form>
          </div>
        </ScrollArea>

        <DialogFooter className="bg-slate-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
          <div className="flex-1 text-left w-full sm:w-auto">
            {status.state !== 'idle' && (
              <p className={`text-sm font-semibold ${status.state === 'error' ? 'text-destructive' : 'text-[#1a3e62]'}`}>
                {status.message}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="px-6 border-slate-200 text-slate-600 hover:bg-slate-100 font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="contract-form"
              disabled={saving}
              className="bg-[#1a3e62] hover:bg-[#122c46] text-white px-8 font-semibold shadow-md"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingContractId ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {editingContractId ? 'Update Contract' : 'Add Contract'}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

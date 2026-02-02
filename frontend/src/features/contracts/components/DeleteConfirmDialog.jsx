import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

/**
 * Delete confirmation dialog component
 */
export function DeleteConfirmDialog({ open, itemName, onConfirm, onCancel, title = "DELETE ITEM" }) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 leading-tight">{title}</DialogTitle>
          <DialogDescription className="text-slate-500 pt-2 text-base">
            Are you sure you want to delete <strong className="text-slate-900">{itemName}</strong>?
            <br />
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0 pt-4">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-slate-600 hover:bg-slate-100 font-medium"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="bg-rose-600 hover:bg-rose-700 font-semibold"
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

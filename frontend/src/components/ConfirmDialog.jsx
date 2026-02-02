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
 * Generic confirmation dialog component
 * @param {boolean} open - Dialog open state
 * @param {string} title - Dialog title
 * @param {string} description - Dialog description text
 * @param {string} confirmText - Text for confirmation button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} confirmVariant - Button variant for confirm action (default: "default")
 * @param {function} onConfirm - Confirm callback
 * @param {function} onCancel - Cancel callback
 */
export function ConfirmDialog({
    open,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmVariant = "default",
    onConfirm,
    onCancel
}) {
    return (
        <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
            <DialogContent className="sm:max-w-md bg-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900 leading-tight">{title}</DialogTitle>
                    <DialogDescription className="text-slate-500 pt-2 text-base">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0 pt-4">
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        className="text-slate-600 hover:bg-slate-100 font-medium"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={confirmVariant}
                        onClick={onConfirm}
                        className={confirmVariant === 'destructive' ? "bg-rose-600 hover:bg-rose-700 font-semibold" : "bg-[#1a3e62] hover:bg-[#122c46] font-semibold"}
                    >
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

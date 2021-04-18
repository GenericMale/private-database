import {Injectable} from '@angular/core';

import {DialogService} from 'primeng/dynamicdialog';
import {DynamicDialogRef} from 'primeng/dynamicdialog/dynamicdialog-ref';
import {ProgressSpinner} from 'primeng/progressspinner';
import {tap} from 'rxjs/operators';
import {OperatorFunction} from 'rxjs';

@Injectable()
export class ProgressService {

    private dialogRef: DynamicDialogRef;
    private runningRequests = 0;

    constructor(private dialogService: DialogService) {
    }

    show() {
        this.runningRequests++;

        if (!this.dialogRef) {
            this.dialogRef = this.dialogService.open(ProgressSpinner, {
                closeOnEscape: false,
                dismissableMask: false,
                closable: false,
                showHeader: false,
                transitionOptions: '0ms',
                styleClass: 'progress-dialog'
            });
        }
    }

    tapHide<T>(): OperatorFunction<T, T> {
        return tap(() => this.hide(), (e: any) => this.hide());
    }

    hide() {
        this.runningRequests--;

        if (this.runningRequests === 0) {
            this.dialogRef.close();
            this.dialogRef = null;
        }
    }
}

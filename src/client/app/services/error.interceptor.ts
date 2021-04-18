import {Injectable} from '@angular/core';
import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';
import {MessageService} from 'primeng/api';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

    constructor(private messageService: MessageService) {
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const skipError = req.params.has('skipError');
        if (skipError) {
            req = req.clone({params: req.params.delete('skipError')});
            return next.handle(req);
        }

        return next.handle(req).pipe(tap(() => {}, (error: HttpErrorResponse) => {
            let detail;

            if (error.error && error.error.message) {
                detail = error.error.message;
            } else {
                detail = error.message;
            }

            this.messageService.add({severity: 'error', summary: error.statusText, detail, life: 5000});
        }));
    }
}

import {Injectable} from '@angular/core';
import {HttpEvent, HttpEventType, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';
import {ProgressService} from './progress.service';

@Injectable()
export class ProgressInterceptor implements HttpInterceptor {

    constructor(private progress: ProgressService) {
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const skipProgress = req.params.has('skipProgress');
        if (skipProgress) {
            req = req.clone({params: req.params.delete('skipProgress')});
            return next.handle(req);
        }

        this.progress.show();
        return next.handle(req).pipe(tap((event) => {
            if (event.type === HttpEventType.Response) {
                this.progress.hide();
            }
        }, () => this.progress.hide()));
    }
}

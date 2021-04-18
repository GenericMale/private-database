import {APP_INITIALIZER, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {FormsModule} from '@angular/forms';
import {HTTP_INTERCEPTORS, HttpClient, HttpClientModule} from '@angular/common/http';

import {catchError} from 'rxjs/operators';
import {of} from 'rxjs';

import {TranslateLoader, TranslateModule, TranslateService} from '@ngx-translate/core';
import {TranslateHttpLoader} from '@ngx-translate/http-loader';

import {InputTextModule} from 'primeng/inputtext';
import {ButtonModule} from 'primeng/button';
import {TableModule} from 'primeng/table';
import {DialogModule} from 'primeng/dialog';
import {RippleModule} from 'primeng/ripple';
import {ToolbarModule} from 'primeng/toolbar';
import {DialogService, DynamicDialogModule} from 'primeng/dynamicdialog';
import {DropdownModule} from 'primeng/dropdown';
import {ProgressSpinnerModule} from 'primeng/progressspinner';
import {ToastModule} from 'primeng/toast';
import {MenuModule} from 'primeng/menu';
import {SidebarModule} from 'primeng/sidebar';
import {ListboxModule} from 'primeng/listbox';
import {OverlayPanelModule} from 'primeng/overlaypanel';
import {InputSwitchModule} from 'primeng/inputswitch';
import {MessageService} from 'primeng/api';

import {AngularSplitModule} from 'angular-split';

import {UrlEncodingInterceptor} from './services/url-encoding.interceptor';
import {ProgressInterceptor} from './services/progress.interceptor';
import {ErrorInterceptor} from './services/error.interceptor';

import {AppComponent, SafeHtmlPipe} from './app.component';
import {SearchDialogComponent} from './components/search-dialog.component';

import {DatabaseService} from './services/database.service';
import {PluginService} from './services/plugin.service';
import {VideoDialogComponent} from './components/video-dialog.component';
import {ProgressService} from './services/progress.service';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
    return new TranslateHttpLoader(http);
}

// Make sure translation is loaded before app starts
// use browser language and fall back to english
export function loadTranslation(translate: TranslateService) {
    return () => {
        translate.setDefaultLang('en');
        return translate.use(translate.getBrowserLang()).pipe(catchError(() => of())).toPromise();
    };
}

@NgModule({
    declarations: [
        AppComponent,
        SearchDialogComponent,
        VideoDialogComponent,
        SafeHtmlPipe
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        HttpClientModule,

        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [HttpClient]
            }
        }),

        TableModule,
        InputTextModule,
        DialogModule,
        ButtonModule,
        RippleModule,
        ToolbarModule,
        DynamicDialogModule,
        DropdownModule,
        ProgressSpinnerModule,
        ToastModule,
        MenuModule,
        SidebarModule,
        ListboxModule,
        OverlayPanelModule,
        InputSwitchModule,

        AngularSplitModule.forRoot()
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            useFactory: loadTranslation,
            deps: [TranslateService],
            multi: true
        },
        { provide: HTTP_INTERCEPTORS, useClass: UrlEncodingInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ProgressInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },

        DialogService,
        MessageService,

        DatabaseService,
        PluginService,
        ProgressService
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}

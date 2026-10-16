import {
  ApplicationConfig,
  PLATFORM_ID,
  inject,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideNativeDateAdapter } from '@angular/material/core';
import { isPlatformBrowser, registerLocaleData } from '@angular/common';

import localesEs from '@angular/common/locales/es-CO';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { ScaleConfigService } from './core/services/scale-config.service';
import { ScaleService } from './core/services/scale.service';
import { MockScaleService } from './core/services/mock-scale.service';
import { WebSerialScaleService, supportsWebSerial } from './core/services/web-serial-scale.service';

registerLocaleData(localesEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideAnimations(),
    provideNativeDateAdapter(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    {
      provide: ScaleService,
      useFactory: () => {
        const platformId = inject(PLATFORM_ID);
        if (isPlatformBrowser(platformId) && supportsWebSerial()) {
          return new WebSerialScaleService(inject(ScaleConfigService), platformId);
        }
        return new MockScaleService();
      },
    },
  ],
};

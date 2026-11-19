import '@analogjs/vitest-angular/setup-zone';

import { destroyPlatform } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

// When all spec files run in one process (CI), a platform created for a
// previous file can still be registered; clear it before setting up again.
destroyPlatform();

getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

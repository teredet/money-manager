import { createRouter, createWebHistory } from 'vue-router';

import Dashboard from './components/pages/Dashboard.vue';
import Accounts from './components/pages/Accaunts.vue';
import Reports from './components/pages/Reports.vue';
import Settings from './components/pages/Settings.vue';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'Dashboard', component: Dashboard },
    { path: '/accounts', name: 'Accounts', component: Accounts },
    { path: '/reports', name: 'Reports', component: Reports },
    { path: '/settings', name: 'Settings', component: Settings },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

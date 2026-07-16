import { api } from '@shared/api';

export const getSettings = () => api('customer_portal.api.store.get_settings');
export const getHome     = () => api('customer_portal.api.store.get_home');

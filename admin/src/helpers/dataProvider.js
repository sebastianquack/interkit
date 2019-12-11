import { fetchUtils } from 'react-admin';

import restHapiProvider from './ra-data-rest-hapi-fixed.js';

const apiUrl = "/api";

const httpClient = (url, options = {}) => {
    if (!options.headers) {
        options.headers = new Headers({ Accept: 'application/json' });
    }
    const token = localStorage.getItem('token');
    options.headers.set('authorization', `${token}`);
    return fetchUtils.fetchJson(url, options);
}

const extendDataProvider = requestHandler => async (type, resource, params) => {

    console.log(type, resource, params);

    // for other request types and resources, fall back to the default request handler
    return requestHandler(type, resource, params);
};

const dataProvider = extendDataProvider(restHapiProvider(apiUrl, httpClient));

export { dataProvider }




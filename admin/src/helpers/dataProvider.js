import { fetchUtils } from 'react-admin';
import { s3Upload, s3Delete } from "./s3.js";

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

    if (type === 'CREATE' && resource === 'file') {

      let response = null
      for(let i = 0; i < params.data.files.length; i++) {

        let url = await s3Upload(params.data.files[i]);
        if(url) {
          response = await requestHandler(type, resource, {data: {
            filename: params.data.files[i].title, 
            path: params.data.files[i].title
          }});   
          console.log(response)
        } else {
          throw new Error("upload error");
        } 
      }
      return response;
    }

    if (type === 'DELETE' && resource === 'file') {
        let file = await requestHandler('GET_ONE', 'file', { id: params.id });
        if(file && file.data) {
          s3Delete(file.data);
        }
        console.log("now dispatching normal delete request to api");
    }

    // for other request types and resources, fall back to the default request handler
    return requestHandler(type, resource, params);
};

const dataProvider = extendDataProvider(restHapiProvider(apiUrl, httpClient));

export { dataProvider }




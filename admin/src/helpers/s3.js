import axios from 'axios';

const s3Upload = async (file) => {
    // Split the filename to get the name and type
    let fileParts = file.title.split('.');
    let fileName = file.title;
    let fileType = fileParts[1];
    console.log("Preparing the upload", fileName, fileType);
    
    let response = await axios.post("/api/s3_sign", {
      fileName : fileName,
      fileType : fileType
    });
    if(!response) return null;

    console.log(response);

    var returnData = response.data.data.returnData;
    var signedRequest = returnData.signedRequest;
    var url = returnData.url;
  
    console.log("Recieved a signed request " + signedRequest);
    // Put the fileType in the headers for the upload
    var options = {
      headers: {
        'Content-Type': fileType
      },
      onUploadProgress: progressEvent => {console.log(progressEvent.loaded);}
    };
  
    let uploadResponse = await axios.put(signedRequest, file.rawFile, options)
    console.log("Response from s3", uploadResponse);

    if(uploadResponse) {
      return url;  
    }
}

const s3Delete = (data) => {
  let fileName = data.filename;
  const token = localStorage.getItem('token');
  axios.post("/api/s3_delete", {
      fileName : fileName
  }, {headers: {authorization: `${token}`}})
}

export { s3Upload, s3Delete };
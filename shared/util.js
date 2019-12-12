
export const getConfig = async (key) => {
  const res = await fetch("/api/config?key=" + key);
  const json = await res.json();
  console.log(json);
  if(json.docs.length)
    return json.docs[0].value;
  else 
    return null;
}
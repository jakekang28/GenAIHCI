export const parseLLM = (response) =>{
    try {
    let s = response.replace(/```json/g, '').replace(/```/g, '').trim();
    s = s.replace(/([\w]+)\s*:/g, '"$1":');
    const parsed = JSON.parse(s)
    return parsed;
  } catch (err) {
    console.warn('JSON parse failed:', err);
    const parsed = { raw: response };
    return parsed;
  }
}
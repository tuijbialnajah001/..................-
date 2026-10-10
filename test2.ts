import axios from "axios";
(async () => {
    try {
        const res = await axios.get("https://yande.re/post.json?tags=breast_focus&limit=1");
        console.log("breast_focus yandere:", res.data.length);
    } catch(e){}
    try {
        const res2 = await axios.get("https://yande.re/post.json?tags=cleavage&limit=1");
        console.log("cleavage yandere:", res2.data.length);
    } catch(e){}
})();

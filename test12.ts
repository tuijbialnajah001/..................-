import axios from "axios";
(async () => {
    try {
        const res = await axios.get("https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=breast_focus sort:score:desc&limit=1");
        console.log("Gelbooru sort:score:desc", res.data?.post?.[0]?.score);
    } catch(e){}
    try {
        const res = await axios.get("https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=breast_focus sort:score:desc&limit=1");
        console.log("Safebooru sort:score:desc", res.data?.[0]?.score);
    } catch(e){}
})();

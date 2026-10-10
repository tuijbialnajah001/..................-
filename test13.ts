import axios from "axios";
(async () => {
    try {
        const res = await axios.get("https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=breast_focus score:>50&limit=1");
        console.log("Gelbooru score:>50", res.data?.post?.[0]?.score);
    } catch(e){}
    try {
        const res = await axios.get("https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=breast_focus score:>20&limit=1");
        console.log("Safebooru score:>20", res.data?.[0]?.score);
    } catch(e){}
})();

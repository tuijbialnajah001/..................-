import axios from "axios";
(async () => {
    try {
        const res = await axios.get("https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=breast_focus sort:score&limit=1");
        console.log("Gelbooru sort:score", res.data?.post?.[0]?.score);
    } catch(e){}
    try {
        const res = await axios.get("https://danbooru.donmai.us/posts.json?tags=breast_focus order:score&limit=1", { headers: { 'User-Agent': 'AnimeVault/1.0' } });
        console.log("Danbooru order:score", res.data?.[0]?.score);
    } catch(e){}
    try {
        const res = await axios.get("https://yande.re/post.json?tags=breast_focus order:score&limit=1");
        console.log("Yande.re order:score", res.data?.[0]?.score);
    } catch(e){}
})();

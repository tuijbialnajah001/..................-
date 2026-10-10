import axios from "axios";
(async () => {
    try {
        const res = await axios.get("https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=breasts", { headers: { 'User-Agent': 'AnimeVault/1.0' } });
        console.log("Gelbooru breasts count", res.data?.post?.length);
    } catch(e){
        console.error(e.message);
    }
})();

import axios from "axios";

export const resolveTags = (query: string, platform: string, nsfw: string): string[] => {
  let tags = query && query !== 'all' ? query.trim().toLowerCase().split(/\s+/) : [];
  
  if (tags.length === 0) {
    if (nsfw === "true") {
      return platform === 'danbooru' ? ['highres', 'masterpiece', '1girl', '-comic', '-manga', '-sketch'] : ['highres', 'masterpiece', '-manga', '-sketch'];
    }
    return platform === 'danbooru' ? ['1girl', 'solo', 'highres'] : ['solo', 'highres'];
  }

  return tags.flatMap(tag => {
    if (platform === 'danbooru') {
      switch (tag) {
        case 'waifu': return ['1girl', 'solo', 'highres'];
        case 'husbando': return ['1boy', 'solo', 'highres'];
        case 'neko': return ['catgirl'];
        case 'kitsune': return ['fox_girl'];
        case 'shrinemaiden': return ['miko'];
        case 'aesthetic': return ['scenery'];
        case 'pixel': return ['pixel_art'];
        case 'char': return ['character'];
        case 'ero': case 'ecchi': return nsfw === "true" ? ['ecchi', 'highres', 'masterpiece', '-comic', '-manga'] : ['1girl'];
        case 'hentai': return nsfw === "true" ? ['sex', 'highres', 'masterpiece', 'absurdres', 'best_quality', 'amazing_quality', 'extremely_detailed', '-comic', '-manga', '-sketch', '-monochrome', '-lowres', '-bad_anatomy'] : ['1girl'];
        case 'oppai': return ['large_breasts', 'highres', 'absurdres', 'masterpiece', '-comic', '-manga'];
        case 'boobs': return ['breast_focus', 'highres', 'absurdres', 'masterpiece', 'best_quality', '-comic', '-manga', '-monochrome', '-sketch'];
        case 'milf': return ['milf', 'mature_female', 'highres', 'masterpiece', '-comic', '-manga', '-sketch'];
        case 'feet': return ['feet', 'highres', 'absurdres', 'masterpiece', '-comic', '-manga', '-sketch'];
        case 'cum': return ['cum', 'highres', 'absurdres', 'masterpiece', '-comic', '-manga', '-sketch'];
        case 'pov': return ['pov', 'highres', 'masterpiece', 'absurdres', '-comic', '-manga', '-sketch'];
        case 'pussy': return ['pussy', 'pussy_juice', 'highres', 'masterpiece', 'absurdres', '-comic', '-manga', '-sketch', '-monochrome'];
        case 'bdsm': return nsfw === "true" ? ['bondage'] : ['1girl'];
        default: return [tag];
      }
    } else {
      switch (tag) {
        case 'waifu': return ['solo', 'highres'];
        case 'husbando': return ['male', 'solo', 'highres'];
        case 'neko': return ['catgirl'];
        case 'kitsune': return ['fox_girl'];
        case 'shrinemaiden': return ['miko'];
        case 'aesthetic': return ['wallpaper'];
        case 'pixel': return ['pixel_art'];
        case 'char': return [];
        case 'ero': case 'ecchi': return nsfw === "true" ? ['ecchi', 'highres', '-manga'] : [];
        case 'hentai': return nsfw === "true" ? ['sex', 'highres', 'masterpiece', 'absurdres', 'best_quality', '-manga', '-comic', '-sketch', '-lowres'] : [];
        case 'oppai': return ['large_breasts', 'highres', '-manga'];
        case 'boobs': return ['breast_focus', 'highres', 'absurdres', 'masterpiece', 'best_quality', '-comic', '-manga', '-monochrome', '-sketch'];
        case 'milf': return ['mother', 'highres', 'masterpiece', '-manga', '-sketch'];
        case 'feet': return ['feet', 'highres', '-manga', '-sketch'];
        case 'cum': return ['cum', 'highres', '-manga', '-sketch'];
        case 'pov': return ['pov', 'highres', 'masterpiece', '-manga', '-sketch'];
        case 'pussy': return ['pussy', 'highres', 'masterpiece', '-manga', '-sketch'];
        case 'bdsm': return nsfw === "true" ? ['bondage'] : [];
        default: return [tag];
      }
    }
  });
};

export interface BooruSearchOptions {
  query?: string;
  nsfw?: boolean | string;
  page?: number | string;
  per_page?: number | string;
  gif?: boolean | string;
}

export async function searchBooruMedia({
  query = '',
  nsfw = 'false',
  page = 1,
  per_page = 200,
  gif = 'false'
}: BooruSearchOptions) {
  const nsfwStr = String(nsfw) === 'true' ? 'true' : 'false';
  const gifStr = String(gif) === 'true' ? 'true' : 'false';
  const pageNum = Number(page) || 1;
  const limit = Number(per_page) || 200;

  let yUserTags = resolveTags(String(query || ''), 'yandere', nsfwStr);
  if (gifStr === "true") {
    yUserTags.push('animated');
  } else {
    yUserTags.push('-animated');
  }
  let yRatingTag = nsfwStr === "true" ? "rating:explicit" : "rating:safe";
  const yandereTags = [...yUserTags, yRatingTag].join(" ") + (query === 'boobs' ? ' order:score' : '');

  let dUserTags = resolveTags(String(query || ''), 'danbooru', nsfwStr);
  let danbooruTags = "";
  if (gifStr === "true") {
    // When video mode is requested, prioritize filetype:mp4 or animated with explicit rating and order:score for best quality
    const baseTags = dUserTags.length > 0 ? dUserTags.slice(0, 1) : ['animated'];
    const dRating = nsfwStr === "true" ? "rating:e" : "rating:g";
    danbooruTags = [...baseTags, 'animated', dRating, 'order:score'].join(" ");
  } else {
    let dRatingTag = nsfwStr === "true" ? "rating:e" : "rating:g";
    danbooruTags = [...dUserTags.slice(0, 1), dRatingTag, 'order:score'].join(" ");
  }

  let generalUserTags = resolveTags(String(query || ''), 'general', nsfwStr);
  if (gifStr === "true") {
    generalUserTags.push('animated');
    generalUserTags.push('video');
  }
  
  const generalTags = generalUserTags.join(" ") + (query === 'boobs' ? ' score:>10' : '');
  const gelbooruTags = nsfwStr === "true" ? `${generalTags} rating:explicit` : `${generalTags} rating:general`;
  const safebooruTags = generalTags;

  const queryLimit = 100;

  const fetchIf = (condition: boolean, url: string, params: any) => {
    if (!condition) return Promise.resolve({ data: [] });
    return axios.get(url, { 
      params, 
      headers: { 'User-Agent': 'AnimeVault/1.0' },
      timeout: 10000 
    }).catch(() => ({ data: [] }));
  };

  const danbooruVideoQuery = gifStr === "true"
    ? (dUserTags.length > 0 ? `${dUserTags[0]} filetype:mp4 rating:e` : 'filetype:mp4 rating:e order:score')
    : danbooruTags;

  const [yandereRes, danbooruRes, konachanRes, gelbooruRes, safebooruRes, rule34Res, xbooruRes, tbibRes, realbooruRes] = await Promise.allSettled([
    fetchIf(gifStr !== "true", "https://yande.re/post.json", { page: pageNum, limit: queryLimit, tags: yandereTags }),
    fetchIf(true, "https://danbooru.donmai.us/posts.json", { page: pageNum, limit: queryLimit, tags: danbooruVideoQuery }),
    fetchIf(gifStr !== "true", "https://konachan.com/post.json", { page: pageNum, limit: queryLimit, tags: yandereTags }),
    fetchIf(true, "https://gelbooru.com/index.php", { 
      page: 'dapi', s: 'post', q: 'index', json: 1, limit: queryLimit, pid: Number(pageNum) - 1,
      tags: gelbooruTags
    }),
    fetchIf(nsfwStr === "false", "https://safebooru.org/index.php", { 
      page: 'dapi', s: 'post', q: 'index', json: 1, limit: queryLimit, pid: Number(pageNum) - 1, tags: safebooruTags
    }),
    fetchIf(nsfwStr === "true", "https://api.rule34.xxx/index.php", { 
      page: 'dapi', s: 'post', q: 'index', json: 1, limit: queryLimit, pid: Number(pageNum) - 1, tags: generalTags
    }),
    fetchIf(nsfwStr === "true", "https://xbooru.com/index.php", { 
      page: 'dapi', s: 'post', q: 'index', json: 1, limit: queryLimit, pid: Number(pageNum) - 1, tags: generalTags
    }),
    fetchIf(nsfwStr === "false", "https://tbib.org/index.php", { 
      page: 'dapi', s: 'post', q: 'index', json: 1, limit: queryLimit, pid: Number(pageNum) - 1, tags: safebooruTags
    }),
    fetchIf(nsfwStr === "true", "https://realbooru.com/index.php", { 
      page: 'dapi', s: 'post', q: 'index', json: 1, limit: queryLimit, pid: Number(pageNum) - 1, tags: generalTags
    })
  ]);

  const processPosts = (res: any, sourceName: string) => {
    if (res.status !== 'fulfilled') return [];
    
    const prefixMap: Record<string, string> = {
      'yande.re': 'yandere',
      'danbooru': 'danbooru',
      'konachan.com': 'konachan',
      'gelbooru.com': 'gelbooru',
      'safebooru.org': 'safebooru',
      'rule34.xxx': 'rule34',
      'xbooru.com': 'xbooru',
      'tbib.org': 'tbib',
      'realbooru.com': 'realbooru'
    };
    const prefix = prefixMap[sourceName] || sourceName;
    
    let postsData = [];
    if (sourceName === 'gelbooru.com' || sourceName === 'safebooru.org' || sourceName === 'rule34.xxx' || sourceName === 'xbooru.com' || sourceName === 'tbib.org' || sourceName === 'realbooru.com') {
      postsData = res.value.data && Array.isArray(res.value.data.post) ? res.value.data.post : (Array.isArray(res.value.data) ? res.value.data : []);
    } else {
      postsData = Array.isArray(res.value.data) ? res.value.data : [];
    }

    return postsData.map((post: any) => {
      let fileUrl = post.file_url;
      if (fileUrl && fileUrl.startsWith('//')) fileUrl = 'https:' + fileUrl;
      
      let previewUrl = post.preview_url || post.preview_file_url;
      if (previewUrl && previewUrl.startsWith('//')) previewUrl = 'https:' + previewUrl;
      
      let sampleUrl = post.sample_url || post.large_file_url;
      if (sampleUrl && sampleUrl.startsWith('//')) sampleUrl = 'https:' + sampleUrl;

      const ext = (post.image || fileUrl || '').split('?')[0].split('.').pop()?.toLowerCase();
      const isAnim = ext === 'gif' || ext === 'webm' || ext === 'mp4';

      if (!fileUrl && post.directory && post.image) {
         let domain = 'gelbooru.com';
         let proto = 'https';
         if (sourceName.includes('rule34')) domain = 'api.rule34.xxx';
         else if (sourceName.includes('safebooru')) domain = 'safebooru.org';
         else if (sourceName.includes('xbooru')) domain = 'xbooru.com';
         else if (sourceName.includes('tbib')) domain = 'tbib.org';
         else if (sourceName.includes('realbooru')) domain = 'realbooru.com';
         fileUrl = `${proto}://${domain}/images/${post.directory}/${post.image}`;
         if (!previewUrl) {
            previewUrl = `${proto}://${domain}/thumbnails/${post.directory}/thumbnail_${post.image.split('.')[0]}.jpg`;
         }
         if (!sampleUrl) {
            sampleUrl = isAnim 
              ? fileUrl 
              : `${proto}://${domain}/samples/${post.directory}/sample_${post.image.split('.')[0]}.jpg`;
         }
      }
      
      let md5 = post.md5 || post.hash;
      if (!md5 && fileUrl) {
         const match = fileUrl.match(/([a-fA-F0-9]{32})\./);
         if (match) md5 = match[1].toLowerCase();
      }

      let variants: any[] = [];
      if (post.media_asset && Array.isArray(post.media_asset.variants)) {
        variants = post.media_asset.variants.map((v: any) => {
          let vUrl = v.url;
          if (vUrl && vUrl.startsWith('//')) vUrl = 'https:' + vUrl;
          return {
            type: v.type,
            url: vUrl,
            width: v.width,
            height: v.height
          };
        }).filter((v: any) => !!v.url);
      } else {
        if (fileUrl) {
          variants.push({
            type: 'original',
            url: fileUrl,
            width: post.width || post.image_width,
            height: post.height || post.image_height
          });
        }
        if (sampleUrl && sampleUrl !== fileUrl) {
          variants.push({
            type: 'sample',
            url: sampleUrl,
            width: post.width || post.image_width,
            height: post.height || post.image_height
          });
        }
      }

      const fileLower = (fileUrl || '').toLowerCase();
      const isVideoFile = fileLower.endsWith('.mp4') || fileLower.endsWith('.webm') || fileLower.endsWith('.gif');
      let effectiveSampleUrl = sampleUrl || fileUrl;
      // Never allow a static .jpg thumbnail to replace an animated video/gif
      if (isVideoFile && (effectiveSampleUrl.toLowerCase().endsWith('.jpg') || effectiveSampleUrl.toLowerCase().endsWith('.jpeg') || effectiveSampleUrl.toLowerCase().endsWith('.png'))) {
        effectiveSampleUrl = fileUrl;
      }

      return {
        id: `${prefix}_${post.id}`,
        md5: md5,
        width: post.width || post.image_width,
        height: post.height || post.image_height,
        file_url: fileUrl,
        preview_url: previewUrl || fileUrl,
        sample_url: effectiveSampleUrl,
        is_animated: isVideoFile,
        is_video: fileLower.endsWith('.mp4') || fileLower.endsWith('.webm'),
        tags: post.tags || post.tag_string || '',
        rating: post.rating || 's',
        score: parseInt(post.score) || 0,
        owner: post.author || post.creator_id?.toString() || post.owner,
        source: sourceName,
        variants: variants
      };
    }).filter((post: any) => {
      if (!post.file_url) return false;
      const lowerUrl = post.file_url.toLowerCase();
      
      if (
        lowerUrl.endsWith('.zip') || 
        lowerUrl.endsWith('.swf') ||
        lowerUrl.endsWith('.7z') ||
        lowerUrl.endsWith('.rar')
      ) {
        return false;
      }

      const isVideoFile = lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.gif');
      if (gifStr === "true") {
        if (!isVideoFile) return false;
      } else {
        // Image mode: exclude long videos/webms
        if (lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm')) return false;
      }

      const minDimension = 400;
      if (post.width && post.height && (post.width < minDimension && post.height < minDimension)) {
        return false;
      }

      return true;
    });
  };

  const allPosts = [
    ...processPosts(yandereRes, 'yande.re'),
    ...processPosts(danbooruRes, 'danbooru'),
    ...processPosts(konachanRes, 'konachan.com'),
    ...processPosts(gelbooruRes, 'gelbooru.com'),
    ...processPosts(safebooruRes, 'safebooru.org'),
    ...processPosts(rule34Res, 'rule34.xxx'),
    ...processPosts(xbooruRes, 'xbooru.com'),
    ...processPosts(tbibRes, 'tbib.org'),
    ...processPosts(realbooruRes, 'realbooru.com')
  ];

  const seenMd5 = new Set<string>();
  const seenUrl = new Set<string>();
  const mergedPosts: any[] = [];
  for (const post of allPosts) {
    if (post.md5) {
      if (seenMd5.has(post.md5)) continue;
      seenMd5.add(post.md5);
    }
    if (post.file_url) {
      if (seenUrl.has(post.file_url)) continue;
      seenUrl.add(post.file_url);
    }
    mergedPosts.push(post);
  }

  mergedPosts.sort((a, b) => {
    const scoreA = parseInt(a.score) || 0;
    const scoreB = parseInt(b.score) || 0;
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    return Math.random() - 0.5;
  });

  const total = mergedPosts.length >= queryLimit ? limit * pageNum + mergedPosts.length : mergedPosts.length;
  return { posts: mergedPosts, total };
}

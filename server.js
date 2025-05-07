// SETUP
import express from 'express';
import { Liquid } from 'liquidjs';

const app = express();
const engine = new Liquid();

app.engine('liquid', engine.express());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.set('port', process.env.PORT || 8000);
app.set('views', './views');

// VARIABLES
const baseURL = "https://fdnd-agency.directus.app/items/tm_";
const defaultProfile = 124;

let stories = await fetch(`${baseURL}story?fields=*.*`);
let seasons = await fetch(`${baseURL}season`);
let languages = await fetch(`${baseURL}language`);
let animals = await fetch(`${baseURL}animal`);
let playlists = await fetch(`${baseURL}playlist?fields=creator,id,title,image.*`);

let storiesJSON = await stories.json();
let seasonsJSON = await seasons.json();
let languagesJSON = await languages.json();
let animalsJSON = await animals.json();
let playlistsJSON = await playlists.json();

// ROUTES
app.get("/", async function (req, res) {
  let likes = await fetch(`${baseURL}likes?fields=playlist&filter[_and][0][profile][id][_eq]=${defaultProfile}&filter[_and][1][playlist][_nnull]`);
  let likesJSON = await likes.json();

  // convert array of objects to array of values
  let likesArray = likesJSON.data.map(a => a.playlist);

  // sort playlists
  let playlistsArray = playlistsJSON.data;
  // for each playlist, check if the creator matches the defaultProfile
  const yourPlaylists = playlistsArray.filter((playlist) => playlist.creator == defaultProfile);
  // for each playlist, check if the id is featured in the likesArray
  const likedPlaylists = playlistsArray.filter((playlist) => likesArray.includes(playlist.id));
  // for each playlist, check if the id is NOT featured in the likesArray
  const suggestedPlaylists = playlistsArray.filter((playlist => !likesArray.includes(playlist.id)));

  res.render('index.liquid', {
    stories: storiesJSON.data,
    suggestedPlaylists: suggestedPlaylists,
    likedPlaylists: likedPlaylists,
    yourPlaylists: yourPlaylists
  });
});

app.get("/stories", async function (req, res) {
  res.render('stories.liquid', {
    stories: storiesJSON.data,
    seasons: seasonsJSON.data,
    languages: languagesJSON.data,
    animals: animalsJSON.data,
    playlists: playlistsJSON.data,
  });
});

app.get('/stories/filter', async function (req, res) {
  let queryURL;

  if (req.query.season) {
    queryURL = `?filter={"season":{"_eq":"${req.query.season}"}}`
  }

  if (req.query.language) {
    queryURL = `?filter={"language":{"_eq":"${req.query.language}"}}`
  }
  
  if (req.query.animal) {
    queryURL = `?filter={"animal":{"_eq":"${req.query.animal}"}}`
  }

  if (req.query.query) {
    queryURL = `?filter={"title":{"_icontains":"${req.query.query}"}}`
  }

  if (req.query.sort) {
    queryURL = `?sort=${req.query.sort}`
  }

  // let season = req.query.season;
  // let language = req.query.language;
  // let sort = req.query.sort;
  // let animal = req.query.animal;
  // let query = req.query.query;
  
  // if (req.query.season) { filterURL += `{"season":{"_eq":"${season}"}}` };

  // stories = await fetch(`${baseURL}/tm_story/?filter={"_and":[{"season":{"_eq":"${season}"}},{"animal":{"_eq":"${animal}"}},{"language":{"_eq":"${language}}"}},{"title":{"_icontains":"${query}"}}]}&sort=${sort}`)
  let stories = await fetch(`${baseURL}story/${queryURL}`);
  let storiesJSON = await stories.json();

  res.render('stories.liquid', {
    stories: storiesJSON.data,
    seasons: seasonsJSON.data,
    languages: languagesJSON.data,
    animals: animalsJSON.data,
    playlists: playlistsJSON.data,
  });
});

app.post(`/:profile/:playlist/like`, async function (req, res) {
  await fetch(`${baseURL}likes`, {
    method: 'POST',
    body: JSON.stringify({
      profile: defaultProfile,
      playlist: req.params.playlist,
    }),
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    }
  });

  res.redirect(303, '/');
});

app.post('/:profile/:playlist/unlike', async function (req, res) {
  const like = await fetch(`${baseURL}likes?filter[_and][0][profile][_eq]=${defaultProfile}&filter[_and][1][playlist][_eq]=${req.params.playlist}`);
  const likeJSON = await like.json();
  const likeID = likeJSON.data[0].id;

  await fetch(`${baseURL}likes/${likeID}`, {
    method: 'DELETE'
  });

  res.redirect(303, `/`);
})

app.listen(app.get('port'), function () {
  console.log(`Application started on http://localhost:${app.get('port')}`);
});
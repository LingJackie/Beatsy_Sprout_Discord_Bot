const Discord = require('discord.js');

const {
	prefix,
	token,
} = require('./config.json');
const ytdl = require('ytdl-core');//youtube module
const ytpl = require('ytpl')//youtube thingy again but for playlists



const client = new Discord.Client();
const queue = new Map();//key would be the guild/server id and value is queueConstruct => contains the song queue




client.once('ready', () => {
 console.log('Ready!');
});
client.once('reconnecting', () => {
 console.log('Reconnecting!');
});
client.once('disconnect', () => {
 console.log('Disconnect!');
});



/*******   Helpers      ******/

//takes the playlist link and convert into a song array
async function processYTPlaylist(playlistLink){
    playlist = await ytpl(playlistLink);//returns JSON metadata
    vidArr = playlist.items;
    //console.log(playlist.items);
    var songs = [];
    for (var i = 0; i < vidArr.length; i++){
        tmpSong = {
            title: vidArr[i].title,
            url: "https://www.youtube.com/watch?v=" + vidArr[i].id,
        };
        songs.push(tmpSong);
    }
    console.log("Processed Playlist:\n", songs);
    return songs;
}
async function getPlaylistTitle(playlistLink){
    playlistTitle = await ytpl(playlistLink);
    return playlistTitle.title;
}
//Fisher-Yates shuffle
function shuffle(array) {
	let currentIndex = array.length,  randomIndex;

	// While there remain elements to shuffle...
	while (currentIndex != 0) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		[array[currentIndex], array[randomIndex]] = [
		  array[randomIndex], array[currentIndex]];
	}
	return array;
}
//checks if commands like stop, skip, shuffle are valid 
function isCommandValid(message, serverQueue){
	if (!message.member.voice.channel){
		message.channel.send("You have to be in a voice channel to do that");
		return false;
	}
	if (!serverQueue){
		message.channel.send("There are no songs");
		return false;
	}
	return true;	
}
function isUrlValid(url){
	return;
}
//should be from 1 to 5
function changeVolume(vol){
	if(vol <= 5 && vol >=0){
		serverQueue.volume = vol;
		dispatcher.setVolumeLogarithmic(vol / 10);
	}
}







client.on("message", async message => {
	if (message.author.bot) return;//ignore if command comes from bot
	if (!message.content.startsWith(prefix)) return;

	const serverQueue = queue.get(message.guild.id);
	if (message.content.startsWith(`${prefix}playlist`)) {//gotta be before play 
		executePlist(message, serverQueue);
		return;
	}else if (message.content.startsWith(`${prefix}play`)) {
		execute(message, serverQueue);
		return;
	}else if (message.content.startsWith(`${prefix}skip`)) {
		skip(message, serverQueue);
		return;
	}else if (message.content.startsWith(`${prefix}stop`)) {
		stop(message, serverQueue);
		return;
	}else if (message.content.startsWith(`${prefix}shuffle`)) {
		shuffleQueue(message, serverQueue);
		return;
		
	/* resume() broken on this version of Node.js ? 	
	}else if (message.content.startsWith(`${prefix}pause`)) {
		pause(message, serverQueue);
		return;
	}else if (message.content.startsWith(`${prefix}resume`)) {
		resume(message, serverQueue);
		return;
	*/
	} else {
		message.channel.send("You need to enter a valid command!");
	}
});
async function executePlist(message, serverQueue) {
	const cmdSplitted = message.content.split(" ");
	if(cmdSplitted.length == 1)
		return message.channel.send(
			"Needs a url, dummy"
		);

	const voiceChannel = message.member.voice.channel;
	if (!voiceChannel)
		return message.channel.send("You need to be in a voice channel to play music!");
	const permissions = voiceChannel.permissionsFor(message.client.user);
	if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) 
		return message.channel.send("I need the permissions to join and speak in your voice channel!");
	
	//checks incase an invalid url is entered
	var newPlaylist;
	var playlistName;
	try{
		newPlaylist = await processYTPlaylist(cmdSplitted[1]);//async functions always returns a promise; need to use await to get value
		playlistName = await getPlaylistTitle(cmdSplitted[1]);
	}catch (err){
		console.log(err);
		return message.channel.send("naw");
	}
	
	
	//console.log(cmdSplitted[1]);
	
	//creates new queue since there isnt one
	if (!serverQueue) {
		const queueContruct = {
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 2,
			playing: true
		};

		queue.set(message.guild.id, queueContruct);

		queueContruct.songs = newPlaylist;

		console.log("coming from executePlaylist():\n",queueContruct.songs);
		try{
			var connection = await voiceChannel.join();
			queueContruct.connection = connection;
			play(message.guild, queueContruct.songs[0]);
		}catch (err){
			console.log(err);
			queue.delete(message.guild.id);
			return message.channel.send(err);
		}
	}else {
		serverQueue.songs = (serverQueue.songs).concat(newPlaylist);//adds playlist to current queue
		//serverQueue.connection.dispatcher.end();
		//serverQueue.songs = newPlaylist;//replaces current playlist with new one
		return message.channel.send(`${playlistName} has been added to the queue!`);
	}
}

async function execute(message, serverQueue) {
	const cmdSplitted = message.content.split(" ");
	if(cmdSplitted.length == 1)
		return message.channel.send(
			"Needs a url"
		);

	const voiceChannel = message.member.voice.channel;
	if (!voiceChannel)
		return message.channel.send("You need to be in a voice channel to play music!");
	const permissions = voiceChannel.permissionsFor(message.client.user);
	if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) 
		return message.channel.send("I need the permissions to join and speak in your voice channel!");
  

	var songInfo;
	try{
		songInfo = await ytdl.getInfo(cmdSplitted[1]);
	}catch (err){
		console.log(err);
		return message.channel.send("naw");
	}
	

	const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
	};
	console.log("coming from execute():\n",song);

	//checks if song already playing ie if serverQueue is defined
	if (!serverQueue) {
		const queueContruct = {
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 2,
			playing: true
		};

		queue.set(message.guild.id, queueContruct);

		queueContruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueContruct.connection = connection;
			play(message.guild, queueContruct.songs[0]);
		} catch (err) {
			console.log(err);
			queue.delete(message.guild.id);
			return message.channel.send(err);
		}
	}else {
		serverQueue.songs.push(song);
    return message.channel.send(`${song.title} has been added to the queue!`);
  }
}

function skip(message, serverQueue) {
	if(isCommandValid(message, serverQueue)){
		isCommandValid(message, serverQueue);
	
		serverQueue.connection.dispatcher.end();//stops current song
	}
	
}
function stop(message, serverQueue) {
	if(isCommandValid(message, serverQueue)){
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end();
	}
}
function shuffleQueue(message, serverQueue) {
	//if(isCommandValid(message, serverQueue)){
		if(serverQueue){
			//serverQueue.connection.dispatcher.end();
			
			//restOfQueue = (serverQueue.songs).slice(1, (serverQueue.songs).length);
			//console.log("spliced", restOfQueue);
			
			//shuffledQ = shuffle(restOfQueue);
			//console.log("shuffled", shuffledQ);
			
			//serverQueue.song = [(serverQueue.songs)[0]].concat(shuffledQ);
			//console.log("result",serverQueue.songs);
			
			queueCopy = [...(serverQueue.songs)];
			serverQueue.songs = [(serverQueue.songs)[0]].concat(shuffle(queueCopy));
			skip(message, serverQueue);
			
			console.log("Shuffled",serverQueue.songs);
		}
		
	//}
}

/* resume() broken on this version of Node.js ? 
function pause(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
    
  if (!serverQueue)
    return message.channel.send("There is no song that I could pause!");
    
  serverQueue.connection.dispatcher.pause();
  
}

function resume(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
    
  if (!serverQueue)
    return message.channel.send("There is no song that I could resume!");
    
  serverQueue.connection.dispatcher.resume();
  
}
*/


function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }
	
  const dispatcher = serverQueue.connection
    .play(ytdl(song.url, {highWaterMark: 1<<25}))//idk what hightwatermark does but it fixes econnreset error
    .on("finish", () => {//plays next in queue 
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 10);
  //dispatcher.setVolume(serverQueue.volume/20);
  serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}


//keep this at very end of file
client.login(token);
const Discord = require('discord.js');

const {
	prefix,
	token,
} = require('./config.json');
const ytdl = require('ytdl-core');//youtube module
const ytpl = require('ytpl')//youtube thingy again but for playlists



const client = new Discord.Client();
const queue = new Map();







/*
var ytpl = require("ytpl");
const playlist = await ytpl('https://www.youtube.com/playlist?list=PLlLGTTlLJXAX-UwWbyH8m6SGSWRntdCf0');
vidARR = playlist.items;
console.log(playlist.items);
var stuff = [];
for (var i = 0; i < vidARR.length; i++){
    stuff.push(vidARR[1].id);
     console.log(vidARR[1].id);
    
}
console.log(stuff);

*/






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
    const playlist = await ytpl(playlistLink);
    vidArr = playlist.items;
    //console.log(playlist.items);
    var songs = [];
    for (var i = 0; i < vidArr.length; i++){
        tmpSong = {
            title: vidArr[i].title,
            url: "https://www.youtube.com/watch?v=" + vidArr[1].id,
        };
        songs.push(tmpSong);
    }
    console.log(songs);
    return songs;
}











client.on("message", async message => {
	if (message.author.bot) return;
	if (!message.content.startsWith(prefix)) return;

	const serverQueue = queue.get(message.guild.id);

	if (message.content.startsWith(`${prefix}play`)) {
		execute(message, serverQueue);
		return;
	}else if (message.content.startsWith(`${prefix}playlist`)) {
		executePlist(message, serverQueue);
		return;
	}else if (message.content.startsWith(`${prefix}skip`)) {
		skip(message, serverQueue);
		return;
	}else if (message.content.startsWith(`${prefix}stop`)) {
		stop(message, serverQueue);
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
	


	//creates new queue since there isnt one
	if (!serverQueue) {
		const queueContruct = {
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true
		};

		queue.set(message.guild.id, queueContruct);

		queueContruct.songs = await processYTPlaylist();//async always returns a promise; need to uses await to get value

		try {
		  var connection = await voiceChannel.join();
		  queueContruct.connection = connection;
		  play(message.guild, queueContruct.songs[0]);
		} catch (err) {
		  console.log(err);
		  queue.delete(message.guild.id);
		  return message.channel.send(err);
		}
	}else {//adds to existing queue
		serverQueue.songs = (serverQueue.songs).concat(await processYTPlaylist());
		return message.channel.send(`${song.title} has been added to the queue!`);
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
    return message.channel.send(
      "You need to be in a voice channel to play music!"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "I need the permissions to join and speak in your voice channel!"
    );
  }

  const songInfo = await ytdl.getInfo(cmdSplitted[1]);
  

	const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
	};
	console.log(song);

	//checks if song already playing ie if serverQueue is defined
	if (!serverQueue) {
		const queueContruct = {
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
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
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  if (!serverQueue)
    return message.channel.send("There is no song that I could skip!");
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
    
  if (!serverQueue)
    return message.channel.send("There is no song that I could stop!");
    
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
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
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}


//keep this at very end of file
client.login(token);
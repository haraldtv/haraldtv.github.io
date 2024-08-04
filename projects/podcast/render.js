function episodesRender(title) {
    return `<div class="column"></div>
    <div class="columns is-mobile">
            <div class="column is-10 is-centered is-offset-1">
                
                <button onclick="goToPlayer()");">
                <div class="card">
                    <div class="card-content">
                      <div class="media">
                        <div class="media-left">
                          <figure class="image is-96x96">
                            <img
                              src="./favicon_io/favicon-16x16.png"
                              alt="Placeholder image"
                            />
                          </figure>
                        </div>
                        <div class="media-content">
                          <p class="title is-4">`+ title + `</p>
                          <p class="subtitle is-6">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas aliquam sapien at blandit pellentesque. Quisque eu malesuada dui, et gravida...</p>
                        </div>
                      </div>
                      <div class="content">
                        Newest episode: <time datetime="2016-1-1">11:09 PM - 1 Jan 2016</time>
                      </div>
                    </div>
                  </div>
                  </button>

            </div>    
    </div>`
 }



 function goToPlayer() {
    // window.location.replace("http://127.0.0.1:5500/projects/podcast/player/player.html");
    window.location.href = "http://tverdal.com/projects/podcast/player/player.html";
 }



 function parsePodUrl(url) {
  return new Promise((resolve, reject) => {
      var x = new XMLHttpRequest();
      x.open("GET", url, true);
      x.onreadystatechange = function() {
          if (x.readyState == 4) {
              if (x.status == 200) {
                  var doc = x.responseXML;
                  var title = doc.getElementsByTagName("title")[0].childNodes[0].nodeValue;
                  resolve({
                      "title": title,
                      "link": url
                  });
              } else {
                  reject(new Error("Failed to fetch podcast data"));
              }
          }
      };
      x.send(null);
  });
}

 // DB initialization
if (!window.indexedDB) {
  console.log("idb not supported");
} else {
  console.log("Yey! idb supported");
}


// Function to open the database
function openDatabase() {
  return new Promise((resolve, reject) => {
      const request = indexedDB.open("podcasts", 1);

      request.onupgradeneeded = (event) => {
          let db = event.target.result;
          
          // Create the object store if it doesn't already exist
          if (!db.objectStoreNames.contains("Pods")) {
              let pods = db.createObjectStore("Pods", {
                  autoIncrement: true
              });
              pods.createIndex("link", "link");
              pods.createIndex("title", "title", {
                unique: true
              });
              pods.createIndex("img", "img");
          }
      };

      request.onsuccess = (event) => {
          resolve(event.target.result);
      };

      request.onerror = (event) => {
          reject(event.target.error);
      };
  });
}

// Function to insert a podcast link
function insertPodcast(db, link) {
  parsePodUrl(link).then(pod => {
    return new Promise((resolve, reject) => {
      const txn = db.transaction("Pods", "readwrite");
      let store = txn.objectStore("Pods");
      console.log("Pod to add: ")
      console.log(pod)

      let query = store.put(pod);

      query.onsuccess = function (event) {
        console.log("Added link successfully!");
        resolve(event);
      };

      query.onerror = function (event) {
        console.error("Error inserting link:", event.target.error);
        reject(event.target.error);
      };

      txn.oncomplete = function () {
        db.close();
      };
    });
  });
}

// Event listener for the button click
document.getElementById("addPodButton").addEventListener("click", () => {
  const podcastLink = "https://feeds.simplecast.com/82FI35Px";

  if (podcastLink) {
      openDatabase()
          .then(db => {
              return insertPodcast(db, podcastLink);
          })
          .then(() => {
              console.log("Podcast added successfully!");
          })
          .catch(error => {
              console.error("Error:", error);
          });
  } else {
      console.log("Please enter a podcast link.");
  }
});

// Function to get all podcasts
function getAllPodcasts() {
  return new Promise((resolve, reject) => {
      openDatabase().then(db => {
          const txn = db.transaction("Pods", "readonly");
          const store = txn.objectStore("Pods");
          const request = store.getAll();

          request.onsuccess = (event) => {
              resolve(event.target.result);
          };

          request.onerror = (event) => {
              reject(event.target.error);
          };

          txn.oncomplete = () => {
              db.close();
          };
      }).catch(error => {
          reject(error);
      });
  });
}

// Usage example
getAllPodcasts().then(podcasts => {
  for (i=0; i<podcasts.length; i++) {
    console.log(podcasts[i].title);
    document.getElementById("episodes_list").innerHTML += episodesRender(podcasts[i].title);
  }
}).catch(error => {
  console.error("Failed to retrieve podcasts:", error);
});
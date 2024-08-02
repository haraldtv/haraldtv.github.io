var episodesListView = "";

 for (i=0; i< 10; i++) {
    episodesListView += `<div class="column"></div>
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
                          <p class="title is-4">Lorem ipsum dolor`+ i + `</p>
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

 document.getElementById("episodes_list").innerHTML = episodesListView;

 function goToPlayer() {
    // window.location.replace("http://127.0.0.1:5500/projects/podcast/player/player.html");
    window.location.href = "http://tverdal.com/projects/podcast/player/player.html";
 }
fetch("get_events.php")
    .then(res => res.json())
    .then(events => {
        console.log("Events:", events);
        const list = document.getElementById("event-list");

        events.forEach(ev => {
            const div = document.createElement("div");
            div.className = "event";

            console.log("Vor innerHTML - div:", div); // Debug 1

            div.innerHTML = `
              <div class="event-header">
                <h3>${ev.name}</h3>
              </div>
              <p>${ev.description || ""}</p>
              <p>Text</p>
              <p><b>Von:</b> ${ev.start_date}</p>
              <p><b>Bis:</b> ${ev.end_date}</p>
            `;

            console.log("Nach innerHTML - div content:", div.innerHTML); // Debug 2
            console.log("Event-Header div:", div.querySelector('.event-header')); // Debug 3

            list.appendChild(div);
        });
    });
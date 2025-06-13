document.addEventListener('DOMContentLoaded', function() {
    console.log("Loading face claims data...");
    
    // First load face claims data
    fetch('https://raw.githubusercontent.com/nedoramoteris/forksfc/refs/heads/main/veidai.txt')
        .then(response => {
            if (!response.ok) throw new Error(`Network error: ${response.status}`);
            return response.text();
        })
        .then(data => {
            console.log("Raw data received:", data.substring(0, 100) + "...");
            const faceClaims = parseFaceClaimsData(data);
            
            if (faceClaims.length === 0) {
                throw new Error("No valid face claims found in the data");
            }
            
            console.log(`Successfully parsed ${faceClaims.length} face claims`);
            
            // Then load avatar images data
            return fetch('https://raw.githubusercontent.com/nedoramoteris/voratinklis/refs/heads/main/avatarai.txt')
                .then(response => {
                    if (!response.ok) throw new Error(`Network error: ${response.status}`);
                    return response.text();
                })
                .then(avatarData => {
                    const avatarMap = parseAvatarData(avatarData);
                    
                    // Add avatar URLs to face claims by matching character name (veidai.txt column 2) to avatarai.txt column 1
                    faceClaims.forEach(claim => {
                        claim.avatar = avatarMap[claim.character] || '';
                    });
                    
                    // Sort face claims alphabetically by celebrity name
                    faceClaims.sort((a, b) => a.celebrity.localeCompare(b.celebrity));
                    
                    window.faceClaimsData = faceClaims;
                    displayFaceClaims(faceClaims);
                    setupFilters();
                });
        })
        .catch(error => {
            console.error("Error:", error);
            document.getElementById('faceclaims-list').innerHTML = `
                <div class="no-results">
                    Error loading face claims: ${error.message}<br>
                    Please check the console for details.
                </div>
            `;
        });

    // Dark mode toggle
    document.getElementById('dark-mode-toggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    this.innerHTML = document.body.classList.contains('dark-mode') 
        ? `<svg xmlns="http://www.w3.org/2000/svg" class="svg-icon" style="width: 1em; height: 1em; vertical-align: top; fill: currentColor; overflow: hidden;" viewBox="0 0 1024 1024" version="1.1"><path d="M529.611373 1023.38565c-146.112965 0-270.826063-51.707812-374.344078-155.225827C51.74928 764.641808 0.041469 639.826318 0.041469 493.815745c0-105.053891 29.693595-202.326012 88.978393-292.22593 59.38719-89.797526 137.000103-155.942569 232.83874-198.63991 6.041111-4.607627 12.184613-3.788493 18.225724 2.252618 7.576986 4.607627 9.931996 11.365479 6.860244 20.580733C322.677735 83.736961 310.493122 142.202626 310.493122 201.589815c0 135.464227 48.328885 251.474031 144.986656 348.131801 96.657771 96.657771 212.667574 144.986656 348.131801 144.986656 74.541162 0 139.252721-11.365479 194.032283-34.19883C1003.684974 655.799424 1009.726084 656.618558 1015.767195 662.659669c7.576986 4.607627 9.931996 11.365479 6.860244 20.580733C983.104241 786.758417 918.802249 869.286132 829.721465 930.925939 740.743072 992.565746 640.706375 1023.38565 529.611373 1023.38565z"/></svg>`
        : '☀︎';
});
});

function parseAvatarData(data) {
    const lines = data.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    const avatarMap = {};
    
    for (const line of lines) {
        const parts = line.split('\t').map(part => part.trim());
        if (parts.length >= 2) {
            avatarMap[parts[0]] = parts[1]; // Map character name (column 1) to image URL (column 2)
        }
    }
    
    return avatarMap;
}

function parseFaceClaimsData(data) {
    // Split by lines and remove empty lines
    const lines = data.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    const faceClaims = [];
    
    for (const line of lines) {
        // Split by tabs (since the example shows tab-separated values)
        const parts = line.split('\t').map(part => part.trim());
        
        if (parts.length >= 4) {
            faceClaims.push({
                celebrity: parts[0],
                character: parts[1],
                gender: parts[2].toLowerCase(), // Normalize gender to lowercase
                type: parts[3] === '2' ? 'Supporting character' : 'Real' // 1 = Real, 2 = Supporting
            });
        } else {
            console.warn("Skipping incomplete line:", line);
        }
    }
    
    return faceClaims;
}

function displayFaceClaims(faceClaims) {
    const container = document.getElementById('faceclaims-list');
    container.innerHTML = '';
    
    if (!faceClaims || faceClaims.length === 0) {
        container.innerHTML = '<div class="no-results">No face claims match the current filters.</div>';
        return;
    }
    
    faceClaims.forEach(faceClaim => {
        const card = document.createElement('div');
        card.className = 'faceclaim-card';
        
        // Add image if available
        const imageHtml = faceClaim.avatar 
            ? `<div class="faceclaim-image"><img src="${faceClaim.avatar}" alt="${faceClaim.character}" loading="lazy"></div>`
            : '<div class="faceclaim-image no-image">No image</div>';
        
        card.innerHTML = `
            ${imageHtml}
            <div class="faceclaim-info">
                <div class="faceclaim-header">
                    <span class="faceclaim-name">${faceClaim.celebrity}</span>
                    <span class="faceclaim-type ${faceClaim.type === 'Real' ? 'type-real' : 'type-fictional'}">
                        ${faceClaim.type}
                    </span>
                </div>
                <div class="faceclaim-character">as ${faceClaim.character}</div>
                <div class="faceclaim-details">
                    <span>${faceClaim.gender.charAt(0).toUpperCase() + faceClaim.gender.slice(1)}</span>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function setupFilters() {
    const nameFilter = document.getElementById('name-filter');
    const genderFilter = document.getElementById('gender-filter');
    const typeFilter = document.getElementById('type-filter');
    const clearBtn = document.getElementById('clear-filters');
    
    [nameFilter, genderFilter, typeFilter].forEach(filter => {
        filter.addEventListener('input', applyFilters);
        filter.addEventListener('change', applyFilters);
    });
    
    clearBtn.addEventListener('click', () => {
        nameFilter.value = '';
        genderFilter.value = '';
        typeFilter.value = '';
        applyFilters();
    });
}

function applyFilters() {
    const nameTerm = document.getElementById('name-filter').value.toLowerCase();
    const genderTerm = document.getElementById('gender-filter').value.toLowerCase();
    const typeTerm = document.getElementById('type-filter').value;
    
    // Show all (sorted) if no filters are applied
    if (!nameTerm && !genderTerm && !typeTerm) {
        displayFaceClaims(window.faceClaimsData);
        return;
    }
    
    const filtered = window.faceClaimsData.filter(faceClaim => {
        const nameMatch = !nameTerm || 
            faceClaim.celebrity.toLowerCase().includes(nameTerm) || 
            faceClaim.character.toLowerCase().includes(nameTerm);
        
        const genderMatch = !genderTerm || faceClaim.gender === genderTerm;
        const typeMatch = !typeTerm || 
            (typeTerm === 'Real' && faceClaim.type === 'Real') ||
            (typeTerm === 'Supporting' && faceClaim.type === 'Supporting character');
        
        return nameMatch && genderMatch && typeMatch;
    });
    
    displayFaceClaims(filtered);
}

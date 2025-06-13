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
        this.textContent = document.body.classList.contains('dark-mode') ? '🌙' : '☀︎';
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
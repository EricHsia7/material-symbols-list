async function fetchLatestVersionJson() {
    const url = `https://raw.githubusercontent.com/marella/material-symbols/main/_data/versions.json?_${new Date().getTime()}`
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('Failed to fetch the latest version JSON:', error);
        return null;
    }
}


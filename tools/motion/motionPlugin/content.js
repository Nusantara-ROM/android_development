chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "findGerritLinks") {
        findAndLogGerritLinks(sendResponse);
        return true;
    }
    return false;
})

function findAndLogGerritLinks(sendResponseCallback) {

    let responseData = {
        status: "error",
        message: "Elements not found or an error occurred.",
        linkLeft: null,
        linkRight: null
    }

    try {
        let currentElement = document.querySelector("#pg-app");
        if (!currentElement) {
            console.error("Motion: Element #pg-app not found. Aborting.");
            responseData.message = "pg-app not found";
            sendResponseCallback(responseData);
            return;
        }

        if (!currentElement.shadowRoot) {
            console.error("Motion: #pg-app has no shadowRoot. Aborting.");
            responseData.message = "pg-app has no shadow root";
            sendResponseCallback(responseData);
            return;
        }
        currentElement = currentElement.shadowRoot.querySelector("#app-element");
        if (!currentElement) {
            console.log("Motion: Element #app-element within #pg-app's shadowRoot not found. Aborting.");
            responseData.message = "app-element not found";
            sendResponseCallback(responseData);
            return;
        }
        if (!currentElement.shadowRoot) {
            console.log("Motion: #app-element has no shadowRoot. Aborting.");
            responseData.message = "app-element has no shadow root";
            sendResponseCallback(responseData);
            return;
        }
        currentElement = currentElement.shadowRoot.querySelector("main > gr-diff-view");
        if (!currentElement) {
            console.log("Motion: Element 'main > gr-diff-view' within #app-element's shadowRoot not found. Aborting.");
            responseData.message = "gr-diff-view not found";
            sendResponseCallback(responseData);
            return;
        }
        if (!currentElement.shadowRoot) {
            console.log("Motion: 'main > gr-diff-view' has no shadowRoot. Aborting.");
            responseData.message = "gr-diff-view has no shadow root";
            sendResponseCallback(responseData);
            return;
        }
        const grDropdownElement = currentElement.shadowRoot.querySelector("div.stickyHeader > div.subHeader > div.patchRangeLeft > span > gr-dropdown");
        if (!grDropdownElement) {
            console.log("Motion: Element 'gr-dropdown' not found within 'gr-diff-view's shadowRoot. Aborting.");
            responseData.message = "gr-dropdown not found";
            sendResponseCallback(responseData);
            return;
        }

        if (!grDropdownElement.shadowRoot) {
            console.log("Motion: 'gr-dropdown' has no shadowRoot. Aborting.");
            responseData.message = "gr-dropdown has no shadow root";
            sendResponseCallback(responseData);
            return;
        }
        const dropdownShadowRoot = grDropdownElement.shadowRoot;

        const allLinkItems = dropdownShadowRoot.querySelectorAll("#dropdown > div > ul > li");
        allLinkItems.forEach(item => {
            const text = item.textContent || '';
            const linkElement = item.querySelector("gr-tooltip-content > a");
            if (linkElement && linkElement.href) {
                if (text.includes('Left Content')) {
                    responseData.linkLeft = linkElement.href;
                    console.log("Motion: Left link found ", linkElement.href);
                }

                if (text.includes('Right Content')) {
                    responseData.linkRight = linkElement.href;
                    console.log("Motion: Right link found ", linkElement.href);
                }
            }
        })

        if(responseData.linkLeft || responseData.linkRight){
            responseData.status = "success";
            responseData.message = "Links found";
        } else {
            responseData.message = "No relevant links found";
        }
    } catch (error) {
        console.error("Motion: An error occurred during the DOM traversal:", error);
        if (responseData.status === "error" && responseData.message === "Elements not found or an error occurred.") {
            responseData.message = error.message || "An unexpected error occurred.";
        }
    }
    sendResponseCallback(responseData);
}
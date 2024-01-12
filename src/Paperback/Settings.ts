import { DUIButton,
    DUINavigationButton,
    RequestManager,
    SourceStateManager } from '@paperback/types'
import { retrieveStateData,
    setStateData,
    getKomgaAPI,
    getAuthorizationString, } from './Common'
/* Helper functions */
export const testServerSettings = async (stateManager: SourceStateManager, requestManager: RequestManager): Promise<string> => {
    // Try to establish a connection with the server. Return an human readable string containing the test result
    const komgaAPI = await getKomgaAPI(stateManager)
    const authorization = await getAuthorizationString(stateManager)
    // We check credentials are set in server settings
    if (komgaAPI === null || authorization === null) {
        return 'Impossible: Unset credentials in server settings'
    }
    // To test these information, we try to make a connection to the server
    // We could use a better endpoint to test the connection
    const request = App.createRequest({
        url: `${komgaAPI}/libraries`,
        method: 'GET',
        headers: { authorization: authorization }
    })
    let responseStatus = undefined
    try {
        const response = await requestManager.schedule(request, 1)
        responseStatus = response.status
    }
    catch (error: any) {
        // If the server is unavailable error.message will be 'AsyncOperationTimedOutError'
        return `Failed: Could not connect to server - ${error.message}`
    }
    switch (responseStatus) {
        case 200: {
            return 'Successful connection!'
        }
        case 401: {
            return 'Error 401 Unauthorized: Invalid credentials'
        }
        default: {
            return `Error ${responseStatus}`
        }
    }
}
/* UI definition */
// NOTE: Submitted data won't be tested
export const serverSettingsMenu = (stateManager: SourceStateManager): DUINavigationButton => {
    return App.createDUINavigationButton({
        id: 'server_settings',
        label: 'Server Settings',
        form: App.createDUIForm({
            sections: async () => {
                const values = await retrieveStateData(stateManager)
                
                return [
                    App.createDUISection({
                        id: 'information',
                        header: undefined,
                        isHidden: false,
                        rows: async () => [
                            App.createDUIMultilineLabel({
                                label: 'Demo Server',
                                value: 'Server URL: https://demo.komga.org\nUsername: demo@komga.org\nPassword: komga-demo\n\nNote: Values are case-sensitive.',
                                id: 'description'
                            }),
                        ]
                    }),
                    App.createDUISection({
                        id: 'serverSettings',
                        header: 'Server Settings',
                        footer: 'Minimal Komga version: v0.100.0',
                        isHidden: false,
                        rows: async () => [
                            App.createDUIInputField({
                                id: 'serverAddress',
                                label: 'Server URL',
                                value: App.createDUIBinding({
                                    async get() {
                                        return values.serverURL
                                    },
                                    async set(newValue) {
                                        values.serverURL = newValue
                                        console.log('setting ' + newValue)
                                        await setStateData(stateManager, values)
                                    }
                                })
                            }),
                            App.createDUIInputField({
                                id: 'serverUsername',
                                label: 'Email',
                                value: App.createDUIBinding({
                                    async get() {
                                        return values.serverUsername
                                    },
                                    async set(newValue) {
                                        values.serverUsername = newValue
                                        await setStateData(stateManager, values)
                                    }
                                })
                            }),
                            App.createDUISecureInputField({
                                id: 'serverPassword',
                                label: 'Password',
                                value: App.createDUIBinding({
                                    async get() {
                                        return values.serverPassword
                                    },
                                    async set(newValue) {
                                        values.serverPassword = newValue
                                        await setStateData(stateManager, values)
                                    }
                                })
                            }),
                        ]
                    }),
                    App.createDUISection({
                        id: 'sourceOptions',
                        header: 'Source Options',
                        isHidden: false,
                        rows: async () => [
                            App.createDUISwitch({
                                id: 'showOnDeck',
                                label: 'Show On Deck',
                                value: App.createDUIBinding({
                                    async get() {
                                        return values.showOnDeck
                                    },
                                    async set(newValue) {
                                        values.showOnDeck = newValue
                                        await setStateData(stateManager, values)
                                    }
                                })
                            }),
                            App.createDUISwitch({
                                id: 'showContinueReading',
                                label: 'Show Continue Reading',
                                value: App.createDUIBinding({
                                    async get() {
                                        return values.showContinueReading
                                    },
                                    async set(newValue) {
                                        values.showContinueReading = newValue
                                        await setStateData(stateManager, values)
                                    }
                                })
                            }),
                            App.createDUISwitch({
                                id: 'orderResultsAlphabetically',
                                label: 'Sort results alphabetically',
                                value: App.createDUIBinding({
                                    async get() {
                                        return values.orderResultsAlphabetically
                                    },
                                    async set(newValue) {
                                        values.orderResultsAlphabetically = newValue
                                        await setStateData(stateManager, values)
                                    }
                                })
                            }),
                        ]
                    }),
                ]}
        })
    })
}
export const testServerSettingsMenu = (stateManager: SourceStateManager, requestManager: RequestManager): DUINavigationButton => {
    return App.createDUINavigationButton({
        id: 'test_settings',
        label: 'Try settings',
        form: App.createDUIForm({
            sections: async () => [
                App.createDUISection({
                    id: 'information',
                    header: 'Connection to Komga server:',
                    isHidden: false,
                    rows: async () => {
                        const value = await testServerSettings(stateManager, requestManager)

                        return [ 
                            App.createDUILabel({
                                label: value,
                                value: '',
                                id: 'description'
                            }),
                        ]
                    }
                }),
            ]
        })
    })
}
export const resetSettingsButton = (stateManager: SourceStateManager): DUIButton => {
    return App.createDUIButton({
        id: 'reset',
        label: 'Reset to Default',
        onTap: () => setStateData(stateManager, {})
    })
}

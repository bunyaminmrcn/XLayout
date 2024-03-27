import {
    CameraRoll,
    PhotoIdentifier,
} from '@react-native-camera-roll/camera-roll';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Linking,
    Platform,
    Dimensions,
    SafeAreaView,
    StyleSheet,
    Button,
    View, ScrollView, TouchableOpacity, Text,
} from 'react-native';
import Permissions, { PERMISSIONS } from 'react-native-permissions';
import { ShimmerView } from '../../src/components';

const { width, height } = Dimensions.get('window');

import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

let lastCrsr = '';

const App: React.FC = () => {
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [photos, setPhotos] = useState<PhotoIdentifier[]>([]);
    const [main, setMain] = useState(null);

    const openSettingsAlert = useCallback(({ title }: { title: string }) => {
        Alert.alert(title, '', [
            {
                isPreferred: true,
                style: 'default',
                text: 'Open Settings',
                onPress: () => Linking?.openSettings(),
            },
            {
                isPreferred: false,
                style: 'destructive',
                text: 'Cancel',
                onPress: () => { },
            },
        ]);
    }, []);

    const checkAndroidPermissions = useCallback(async () => {
        if (parseInt(Platform.Version as string, 10) >= 33) {
            const permissions = await Permissions.checkMultiple([
                PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
                PERMISSIONS.ANDROID.READ_MEDIA_VIDEO,
            ]);
            if (
                permissions[PERMISSIONS.ANDROID.READ_MEDIA_IMAGES] ===
                Permissions.RESULTS.GRANTED &&
                permissions[PERMISSIONS.ANDROID.READ_MEDIA_VIDEO] ===
                Permissions.RESULTS.GRANTED
            ) {
                setHasPermission(true);
                return;
            }
            const res = await Permissions.requestMultiple([
                PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
                PERMISSIONS.ANDROID.READ_MEDIA_VIDEO,
            ]);
            if (
                res[PERMISSIONS.ANDROID.READ_MEDIA_IMAGES] ===
                Permissions.RESULTS.GRANTED &&
                res[PERMISSIONS.ANDROID.READ_MEDIA_VIDEO] ===
                Permissions.RESULTS.GRANTED
            ) {
                setHasPermission(true);
            }
            if (
                res[PERMISSIONS.ANDROID.READ_MEDIA_IMAGES] ===
                Permissions.RESULTS.DENIED ||
                res[PERMISSIONS.ANDROID.READ_MEDIA_VIDEO] === Permissions.RESULTS.DENIED
            ) {
                checkAndroidPermissions();
            }
            if (
                res[PERMISSIONS.ANDROID.READ_MEDIA_IMAGES] ===
                Permissions.RESULTS.BLOCKED ||
                res[PERMISSIONS.ANDROID.READ_MEDIA_VIDEO] ===
                Permissions.RESULTS.BLOCKED
            ) {
                openSettingsAlert({
                    title: 'Please allow access to your photos and videos from settings',
                });
            }
        } else {
            const permission = await Permissions.check(
                PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
            );
            if (permission === Permissions.RESULTS.GRANTED) {
                setHasPermission(true);
                return;
            }
            const res = await Permissions.request(
                PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
            );
            if (res === Permissions.RESULTS.GRANTED) {
                setHasPermission(true);
            }
            if (res === Permissions.RESULTS.DENIED) {
                checkAndroidPermissions();
            }
            if (res === Permissions.RESULTS.BLOCKED) {
                openSettingsAlert({
                    title: 'Please allow access to the photo library from settings',
                });
            }
        }
    }, [openSettingsAlert]);

    const checkPermission = useCallback(async () => {
        if (Platform.OS === 'ios') {
            const permission = await Permissions.check(PERMISSIONS.IOS.PHOTO_LIBRARY);
            if (
                permission === Permissions.RESULTS.GRANTED ||
                permission === Permissions.RESULTS.LIMITED
            ) {
                setHasPermission(true);
                return;
            }
            const res = await Permissions.request(PERMISSIONS.IOS.PHOTO_LIBRARY);
            if (
                res === Permissions.RESULTS.GRANTED ||
                res === Permissions.RESULTS.LIMITED
            ) {
                setHasPermission(true);
            }
            if (res === Permissions.RESULTS.BLOCKED) {
                openSettingsAlert({
                    title: 'Please allow access to the photo library from settings',
                });
            }
        } else if (Platform.OS === 'android') {
            checkAndroidPermissions();
        }
    }, [checkAndroidPermissions, openSettingsAlert]);

    useEffect(() => {
        checkPermission();
    }, [checkPermission]);

    const [offsetIndex, setOffsetIndex] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isLoadingX, setXLoadingX] = useState(false)
    const [noMorePhotos, setNoMorePhotos] = useState(false);
    const [lastCursor, setLastCursor] = useState('');
    const [initialRender, setInitialRender] = useState(true);
    const fetchPhotos = useCallback(async () => {
        setXLoadingX(true);
        const opts = {
            first: 12,
            assetType: 'Photos',
            after: lastCrsr,
            groupTypes: 'All'
        };
        if(lastCrsr == '') {
            delete opts.after;
        }
        const res = await CameraRoll.getPhotos();
        await new Promise(resolve => setTimeout(resolve, 2000));

        const appendAssets = (data) => {
            const assets = data?.edges;
            console.log({assets })
            setLastCursor(data.page_info.end_cursor);
            lastCrsr = data.page_info.end_cursor;
            if (!data.page_info.has_next_page) {
                setNoMorePhotos(true);
            } else {
                setNoMorePhotos(false)
            }

            setXLoadingX(false);
            if (assets.length > 0) {
                setPhotos(photos_ => [...photos_, ...assets]);
            }
            if (initialRender) {
                if (res?.edges.length != 0) {
                    setMain(res?.edges[0])
                }
                setInitialRender(false)
            }
        }
        appendAssets(res);


        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (hasPermission) {
            fetchPhotos();
        }
    }, [hasPermission, fetchPhotos]);

    const [multiple, setMultiple] = useState(false)
    const [selectedImages, setSelectedImages] = useState([])

    return (
        <View style={styles.container}>
            <View style={{ display: 'none' }}>
                <Text>{lastCursor}</Text>
            </View>
            <View style={styles.imageWrapper}>
                <Image

                    source={{ uri: main?.node?.image?.uri }}
                    style={styles.imageMain}
                    resizeMode='contain'
                />
                <View style={{
                    bottom: 0
                    , position: 'absolute',
                    right: 30, zIndex: 101
                }}>

                    <TouchableOpacity
                        onPress={() => {
                            setSelectedImages(tr => [])
                            setMultiple(tr => !tr)
                        }}
                        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 20, paddingVertical: 5 }}>
                        <Text style={{ fontSize: 26, color: '#fff' }}>Multiple</Text>
                        <Icon name="layers-outline" color="#fff" size={20} />
                    </TouchableOpacity>

                </View>
                <View style={{
                    bottom: 30
                    , position: 'absolute',
                    left: 30, zIndex: 100
                }}>
                    <ScrollView horizontal contentContainerStyle={{ backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                        {
                            selectedImages.map((item, index) => {
                                return (
                                    <Image
                                        key={index}
                                        source={{ uri: item?.node?.image?.uri }}
                                        height={140}
                                        style={{
                                            //marginLeft: index % 3 == 2 ? -5: 0
                                            width: 32, height: 32,
                                            marginRight: 5
                                        }}
                                    />
                                )
                            })
                        }
                    </ScrollView>

                </View>
            </View>
            <View style={styles.photosWrapper}>

                <FlatList
                    horizontal={false}
                    numColumns={3}
                    onEndReached={() => {

                    }}
                    ListFooterComponent={() => <LoadMoreComponent noMorePhotos={noMorePhotos} fetchPhotos={fetchPhotos} isLoadingX={isLoadingX} />}
                    data={isLoading ? Array(15).fill('') : photos}
                    keyExtractor={(_, index) => index.toString()}
                    renderItem={({ item, index }) => {
                        if (isLoading) {
                            return (
                                <ShimmerView key={index} delay={index * 100} width={'33%'} />
                            );
                        }
                        return (
                            <TouchableOpacity style={{ width: '33%', height: 120, marginRight: 3, marginBottom: 3 }} onPress={() => {
                                setMain(item)
                                if (multiple) {
                                    const exist = selectedImages.find(x => x.node.image.uri == item.node.image.uri);
                                    if (exist) {
                                        setSelectedImages(sel => [...(sel.filter(x => x?.node?.image?.uri != exist?.node?.image?.uri))])
                                    } else {
                                        setSelectedImages(sel => [...sel, item])
                                    }

                                }
                            }}>

                                {
                                    multiple && <View style={{
                                        width: 32, height: 32, borderRadius: 16, borderWidth: 3, borderColor: '#fff', position: 'absolute',
                                        top: 10,
                                        right: 10,
                                        zIndex: 10,
                                        textShadowColor: 'rgba(0, 0, 0, 0.75)',
                                        textShadowOffset: { width: -1, height: 1 },
                                        textShadowRadius: 10
                                    }}>
                                        {
                                            selectedImages.find(x => x?.node?.image?.uri == item.node.image.uri) && <Icon name='check' size={30} color={'#0f0'} />
                                        }
                                    </View>
                                }{


                                    <Image
                                        key={item?.node?.image?.uri}
                                        source={{ uri: item?.node?.image?.uri }}
                                        height={140}
                                        style={[styles.image, {
                                            //marginLeft: index % 3 == 2 ? -5: 0
                                        }]}
                                    />


                                }

                            </TouchableOpacity>
                        );
                    }}
                    style={styles.list}
                />
                {isLoadingX && <FlatList
                    style={{ marginTop: 6 }}
                    horizontal={false}
                    numColumns={3}
                    data={isLoadingX ? Array(6).fill('') : []}
                    keyExtractor={(_, index) => index.toString()}
                    renderItem={({ item, index }) => {

                        return (
                            <ShimmerView key={index} delay={index * 100} width={'33%'} />
                        );

                    }
                    }
                >

                </FlatList>
                }


            </View>
        </View>
    )
}

const LoadMoreComponent = React.memo(({ noMorePhotos, fetchPhotos, isLoadingX }) => {
    if (!noMorePhotos) {
        if (isLoadingX) {
            return null;
        }
        return (
            <View style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', paddingBottom: 80 }}>
                <TouchableOpacity>
                    <Button title='LOAD MORE' onPress={() => {
                        fetchPhotos()
                    }}>

                    </Button>
                </TouchableOpacity>
            </View>

        )
    } else {
        return null;
    }

})
export default React.memo(App);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent'
    },
    imageWrapper: {
        flex: 1,
        backgroundColor: 'transparent'
    },
    photosWrapper: {
        flex: 1,
        backgroundColor: 'transparent'
    },
    list: { padding: 16 },
    imageMain: {
        height: height / 2,
        width
    },
    image: {
        height: 120,
        width: '100%',
        borderRadius: 4
    }
})
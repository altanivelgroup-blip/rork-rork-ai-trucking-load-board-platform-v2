import React from "react";
import { View, Image, FlatList, StyleSheet, Text, ActivityIndicator } from "react-native";
import { db } from "@/utils/firebase";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { theme } from "@/constants/theme";

interface PhotoItem {
  id: string;
  url: string;
  createdAt?: any;
}

interface LoadPhotoGalleryProps {
  loadId: string;
  pageSize?: number;
}

export default function LoadPhotoGallery({ loadId, pageSize = 20 }: LoadPhotoGalleryProps) {
  const [items, setItems] = React.useState<PhotoItem[]>([]);
  const [page, setPage] = React.useState<number>(1);
  const [hasMore, setHasMore] = React.useState<boolean>(true);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  
  React.useEffect(() => {
    setIsLoading(true);
    const itemsToFetch = page * pageSize;
    const q = query(
      collection(db, "loads", loadId, "photos"),
      orderBy("createdAt", "desc"),
      limit(itemsToFetch + 1)
    );
    
    return onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as PhotoItem));
      setHasMore(docs.length > itemsToFetch);
      setItems(docs.slice(0, itemsToFetch));
      setIsLoading(false);
    });
  }, [loadId, page, pageSize]);
  
  const renderItem = React.useCallback(({ item }: { item: PhotoItem }) => (
    <View style={styles.container}>
      <Image source={{ uri: item.url }} style={styles.image} />
    </View>
  ), []);
  
  const keyExtractor = React.useCallback((item: PhotoItem) => item.id, []);
  
  const handleLoadMore = React.useCallback(() => {
    if (!isLoading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [isLoading, hasMore]);
  
  const renderFooter = React.useCallback(() => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Text style={styles.loadMoreText}>Pull to load more</Text>
        )}
      </View>
    );
  }, [hasMore, isLoading]);

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      numColumns={3}
      renderItem={renderItem}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      removeClippedSubviews={true}
      maxToRenderPerBatch={pageSize}
      windowSize={5}
      initialNumToRender={pageSize}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 4,
  },
  image: {
    width: 110,
    height: 110,
    borderRadius: 12,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    fontSize: 12,
    color: theme.colors.gray,
  },
});
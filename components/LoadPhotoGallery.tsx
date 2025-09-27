import React from "react";
import { View, Image, FlatList, StyleSheet } from "react-native";
import { db } from "@/utils/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

export default function LoadPhotoGallery({ loadId }: { loadId: string }) {
  const [items, setItems] = React.useState<any[]>([]);
  
  React.useEffect(() => {
    const q = query(collection(db, "loads", loadId, "photos"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [loadId]);

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      numColumns={3}
      renderItem={({ item }) => (
        <View style={styles.container}>
          <Image source={{ uri: item.url }} style={styles.image} />
        </View>
      )}
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
});
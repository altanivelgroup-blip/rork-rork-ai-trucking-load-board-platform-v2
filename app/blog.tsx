import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import Head from 'expo-router/head';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { BLOG_POSTS, type BlogPost } from '@/mocks/blogPosts';

export default function BlogScreen() {
  const router = useRouter();
  const posts = BLOG_POSTS;

  const renderItem = ({ item }: { item: BlogPost }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/blog/${item.slug}` as any)}
        accessibilityRole="button"
        testID={`blog-card-${item.slug}`}
      >
        <Image source={{ uri: item.heroImage }} style={styles.hero} resizeMode="cover" />
        <View style={styles.meta}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.excerpt}>{item.excerpt}</Text>
          <View style={styles.tagsRow}>
            {item.tags.map((t) => (
              <View key={`${item.slug}-${t}`} style={styles.tag}>
                <Text style={styles.tagText}>#{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const keyExtractor = (item: BlogPost) => item.slug;

  return (
    <>
      <Head>
        <title>LoadRush Blog: Hotshot, Car Hauling, and Auto Transport Tips</title>
        <meta name="description" content="Guides and tips on car hauling loads, hotshot dispatch, and truck load finder strategies to grow your business." />
      </Head>
      <View style={styles.container}>
        <Text style={styles.h1} testID="blog-heading">Latest from LoadRush</Text>
        <FlatList
          data={posts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
          testID="blog-list"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.md,
  },
  h1: {
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  list: {
    paddingBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  hero: {
    width: '100%',
    height: 160,
  },
  meta: {
    padding: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.dark,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  excerpt: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: theme.spacing.sm,
  },
  tag: {
    backgroundColor: theme.colors.lightGray,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    fontWeight: '600',
  },
});
